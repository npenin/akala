import { Metadata, Processors } from "@akala/commands";
import fs from 'fs/promises'
import { join, resolve } from "path";
import { base64, lazy, type Logger, mapAsync } from "@akala/core";
import glob from 'fast-glob';
import { xpm } from '@akala/cli'
import * as zip from '@zip.js/zip.js';
import { hasYarn } from "@akala/cli/yarn-helper";
import { createWriteStream, Dirent } from "fs";
import { Writable } from "stream";
import jsonc from 'jsonc-parser'
import { type ServicePolicy } from "../iam.js";

export const ActionPermissionsRemap = {
    s3: {
        ListObjectV2: 'ListBucket',
    },
    lambda: {
        Invoke: 'InvokeFunction'
    }
}

export default async function (logger: Logger, inputPath: string, commandsName: string, environment: string, outputPath: string)
{
    const prefix = environment + '-'
    let commandsPath: string;
    const packageJson: Partial<{
        commands: string | Record<string, string>,
        name: string,
        module: string,
        main: string,
        export: string,
        packageManager: string,
        exports: unknown,
        type: string,
        dependencies: Record<string, string>
    }> = JSON.parse(await fs.readFile(join(inputPath, './package.json'), 'utf-8'));
    if (packageJson.commands)
        if (typeof packageJson.commands == 'string')
            commandsPath = join(inputPath, packageJson.commands);
        else
            commandsPath = join(inputPath, packageJson.commands[commandsName]);
    else
        commandsPath = join(inputPath, 'commands.json');

    const container: Metadata.Container & Partial<{ aws: { permissions: Record<string, Permissions>, compatibleRuntimes?: string[] } }> = await Processors.FileSystem.discoverMetaCommands(commandsPath);

    if (!commandsName)
        commandsName = container.name;

    logger.info('preparing packaging files');

    const packagingFolder = join(outputPath, '.packaging');
    await fs.mkdir(join(packagingFolder, 'container/nodejs'), { recursive: true });
    await fs.mkdir(join(packagingFolder, 'container-deps/nodejs'), { recursive: true });

    await fs.writeFile(join(packagingFolder, 'container/nodejs/package.json'), JSON.stringify({
        name: packageJson.name,
        module: packageJson.module,
        main: packageJson.main,
        export: packageJson.export ?? packageJson.module ?? packageJson.main,
        exports: packageJson.exports,
        type: packageJson.type ?? packageJson.module ? 'module' : 'commonjs',
    }));

    const workspacesArray = lazy(async () =>
    {
        let rootPath = join(inputPath, '..');
        while (true)
        {
            try
            {
                const packageJson = JSON.parse(await fs.readFile(join(rootPath, 'package.json'), 'utf-8'));
                if (packageJson.workspaces)
                    return { workspaces: packageJson.workspaces, rootPath };
            }
            catch (e)
            {
                rootPath = join(rootPath, '..');
            }
        }
    });

    const workspaces = lazy(async () =>
    {
        const workspaces = await workspacesArray();
        const result: Record<string, { name: string, version: string, location: string }> = {};
        for (const workspace of await glob(workspaces.workspaces, { absolute: true, cwd: workspaces.rootPath, onlyDirectories: true }))
        {
            try
            {
                const packageJson = jsonc.parse(await fs.readFile(join(workspace, 'package.json'), 'utf-8'));
                result[packageJson.name] = { name: packageJson.name, version: packageJson.version, location: workspace };
            }
            catch (e)
            {
                if (e.code !== 'ENOENT')
                    console.error(e);
            }
        }

        return result;
    });

    await fs.writeFile(join(packagingFolder, 'container-deps', 'nodejs', 'package.json'), JSON.stringify({
        packageManager: packageJson.packageManager,
        dependencies: Object.fromEntries(await mapAsync(Object.entries(packageJson.dependencies), async (e) =>
        {
            const [name, version] = e as [string, string];
            if (version.startsWith('workspace:'))
                return [name, 'link:' + resolve(join(packagingFolder, 'container-deps'), (await workspaces())[name].location)] as const
            return [name, version] as const;
        }))
    }));

    if (await hasYarn(inputPath))
    {
        await fs.writeFile(join(packagingFolder, 'container-deps/nodejs/yarn.lock'), '');
        await fs.writeFile(join(packagingFolder, 'container-deps/.yarnrc.yml'), `
nodeLinker: node-modules
        `);

    }
    await (await xpm(join(packagingFolder, 'container-deps', 'nodejs'))).setup(join(packagingFolder, 'container-deps', 'nodejs'), { production: true });

    const dependencieszip = await new Promise<void>(async resolve =>
    {
        // const zipStream = new zip.ZipWriterStream({})
        const zipStream = createWriteStream(join(outputPath, 'container-deps.zip'))
        const zipFile = new zip.ZipWriter(Writable.toWeb(zipStream));
        const files = {};
        await walkTree(join(packagingFolder, 'container-deps', 'nodejs'), async (entry, folder, root) =>
        {
            const relativePath = folder.substring(folder.indexOf(root) + root.length);
            const zipFilePath = join('nodejs', relativePath, entry.name);
            if (files[zipFilePath])
                return;
            files[zipFilePath] = true;
            await zipFile.add(zipFilePath, new zip.Uint8ArrayReader(new Uint8Array(await fs.readFile(join(entry.parentPath, entry.name)))));
        });

        zipStream.on('close', resolve);
        await zipFile.close();


    }).then(async () =>
    {
        if (await hasYarn(join(packagingFolder, 'container-deps/nodejs/')))
        {
            try
            {
                return {
                    output_path: join(outputPath, 'container-deps.zip'),
                    output_hash: base64.base64EncArrBuff(await crypto.subtle.digest('SHA-1', (await fs.readFile(join(packagingFolder, 'container-deps/nodejs/node_modules/.yarn-state.yml'))).buffer as ArrayBuffer))
                }
            }
            catch (e)
            {
                if (e.code == 'ENOENT')
                    return {
                        output_path: join(outputPath, 'container-deps.zip'),
                        output_hash: base64.base64EncArrBuff(await crypto.subtle.digest('SHA-1', (await fs.readFile(join(packagingFolder, 'container-deps/nodejs/package-lock.json'))).buffer as ArrayBuffer))
                    }
                else
                    throw e;
            }
        }
        else
            return {
                output_path: join(outputPath, 'container-deps.zip'),
                output_hash: base64.base64EncArrBuff(await crypto.subtle.digest('SHA-1', (await fs.readFile(join(packagingFolder, 'container-deps/nodejs/package-lock.json'))).buffer as ArrayBuffer))
            }


    });

    const containerzip = await new Promise<void>(async resolve =>
    {
        const tsconfig = jsonc.parse(await fs.readFile(join(inputPath, 'tsconfig.json'), 'utf8').catch((e) => e.code == 'ENOENT' ? '{}' : Promise.reject(e)));
        const zipStream = createWriteStream(join(outputPath, 'container.zip'))
        const zipFile = new zip.ZipWriter(Writable.toWeb(zipStream));
        const files = {};
        if (tsconfig.compilerOptions?.outDir)
        {
            await walkTree(join(inputPath, tsconfig.compilerOptions.outDir), async (entry, folder, root) =>
            {
                if (entry.parentPath.includes('node_modules/'))
                    return;
                const relativePath = folder.substring(folder.indexOf(root) + root.length);
                const zipFilePath = join('nodejs', relativePath, entry.name);

                if (files[zipFilePath])
                    return;
                files[zipFilePath] = true;
                await zipFile.add(zipFilePath, new zip.Uint8ArrayReader(new Uint8Array(await fs.readFile(join(entry.parentPath, entry.name)))));
            });
        }
        else
            await walkTree(inputPath, async (entry, folder, root) =>
            {
                if (entry.parentPath.includes('node_modules/'))
                    return;
                const relativePath = folder.substring(folder.indexOf(root) + root.length);
                const zipFilePath = join('nodejs', relativePath, entry.name);

                if (files[zipFilePath])
                    return;
                files[zipFilePath] = true;

                await zipFile.add(zipFilePath, new zip.Uint8ArrayReader(new Uint8Array(await fs.readFile(join(entry.parentPath, entry.name)))));
            });

        zipStream.on('close', resolve);
        await zipFile.close();

    }).then(async () =>
    {
        return {
            output_path: join(outputPath, 'container.zip'),
            output_hash: base64.base64EncArrBuff(await crypto.subtle.digest('SHA-256', (await fs.readFile(join(outputPath, 'container.zip'))).buffer as ArrayBuffer))
        }
    });

    const result: { resources: Record<string, Record<string, object>>, data: Record<string, Record<string, object>> } = {
        resources: {
            aws_s3_bucket: {
                deployment: {
                    bucketPrefix: prefix,
                    tags: {
                        terraform: true,
                        environment: environment
                    }
                }
            },
            aws_s3_bucket_public_access_block: {
                deployment_public_access: {
                    bucket: "${aws_s3_bucket.deployment.id}",
                    block_public_acls: true,
                    block_public_policy: true,
                    ignore_public_acls: true,
                    restrict_public_buckets: true,
                }
            },

            aws_s3_bucket_ownership_controls: {
                deployment: {
                    bucket: "${aws_s3_bucket.deployment.id}",
                    rule: {
                        object_ownership: "BucketOwnerEnforced"
                    }
                }
            },

            aws_s3_object: {
                s3dependencies: {
                    bucket: "${aws_s3_bucket.deployment.id}",
                    key: prefix + commandsName + "-dependencies.zip",
                    source: dependencieszip.output_path,
                    source_hash: dependencieszip.output_hash,
                    tags: { terraform: true, environment }
                },

                s3container: {
                    bucket: "${aws_s3_bucket.deployment.id}",
                    key: prefix + commandsName + ".zip",
                    source: containerzip.output_path,
                    source_hash: containerzip.output_hash,
                    tags: { terraform: true, environment }
                }

            },

            aws_lambda_layer_version: {
                command_dependencies: {
                    s3_bucket: "${aws_s3_bucket.deployment.id}",
                    s3_key: "${aws_s3_object.s3dependencies.key}",
                    layer_name: "${var.prefix}${var.container}_dependencies",
                    source_code_hash: dependencieszip.output_hash,
                    compatible_runtimes: container.aws?.compatibleRuntimes ?? [process.version]
                }
            }
        },

        data: {
            aws_region: { current: {} },

            aws_caller_identity: { current: {} }
        }

    };

    result.resources.aws_lambda = result.resources.aws_lambda || {};
    result.resources.aws_iam_role = result.resources.aws_iam_role || {};
    result.resources.aws_iam_policy = result.resources.aws_iam_policy || {};
    result.resources.aws_iam_role_policy_attachment = result.resources.aws_iam_role_policy_attachment || {};

    container.commands.forEach(command =>
    {
        const functionName = prefix + commandsName + '-' + command.name.replaceAll('.', '-');

        if (!command.config.aws)
            return;

        if (command.config.aws.permissions)
        {
            function getPolicyStatements(servicePolicy: ServicePolicy | undefined | null, serviceArn: string, resourceType: string, subResourceType: string, iamActionPrefix: string, remap: Record<string, string> | undefined, usePrefix: boolean)
            {
                return Object.entries(servicePolicy ?? {}).flatMap(([resource, actions]) =>
                {
                    const resourceTypeArn = resourceType.split(':');
                    const resourceArn = resource.split(':');
                    let region: string = '${data.aws_region.current.name}', account: string = '${data.aws_caller_identity.current.account_id}';
                    switch (resourceTypeArn.length)
                    {
                        case 1:
                            if (resourceTypeArn[0])
                                resourceType = resourceTypeArn[0] + '/';
                            else
                                resourceType = '';
                            break;
                        case 2:
                            region = resourceTypeArn[0];
                            if (resourceTypeArn[1])
                                resourceType = resourceTypeArn[1] + '/';
                            else
                                resourceType = '';
                            break;
                        case 3:
                            region = resourceTypeArn[0];
                            account = resourceTypeArn[1];
                            if (resourceTypeArn[2])
                                resourceType = resourceTypeArn[2] + '/';
                            else
                                resourceType = '';
                            break;
                    }
                    const resources = [];
                    switch (resourceArn.length)
                    {
                        case 1:
                            break;
                        case 2:
                            region = resourceArn[0];
                            resource = resourceArn[1];
                            break;
                        case 3:
                            region = resourceArn[0];
                            account = resourceArn[1];
                            resource = resourceArn[1];
                            break;
                        default:
                            resources.push(resource);
                            break;
                    }
                    if (resources.length == 0)
                    {
                        resources.push(
                            `${serviceArn}:${region}:${account}:${resourceType}${usePrefix ? prefix : ''}${resource}`
                        )
                    }

                    let normalizedActions: Record<string, Partial<Record<'Allow' | 'Deny', string[]>>> = {};

                    Object.entries(actions).forEach(([action, allowed]) =>
                    {
                        if (typeof allowed !== 'object')
                        {
                            if (!normalizedActions[''])
                                normalizedActions[''] = {};
                            if (!normalizedActions[''][allowed ? 'Allow' : 'Deny'])
                                normalizedActions[''][allowed ? 'Allow' : 'Deny'] = [];
                            normalizedActions[''][allowed ? 'Allow' : 'Deny'].push(`${iamActionPrefix}:${remap?.[action] ?? action}`);
                        }
                        else
                            Object.entries(allowed).forEach(([subResource, allowed]) =>
                            {
                                if (subResource == '_default')
                                {
                                    if (!normalizedActions[''])
                                        normalizedActions[''] = {};
                                    if (!normalizedActions[''][allowed ? 'Allow' : 'Deny'])
                                        normalizedActions[''][allowed ? 'Allow' : 'Deny'] = [];
                                    normalizedActions[''][allowed ? 'Allow' : 'Deny'].push(`${iamActionPrefix}:${remap?.[action] ?? action}`);
                                }
                                else
                                {
                                    if (!normalizedActions[subResource])
                                        normalizedActions[subResource] = {};
                                    if (!normalizedActions[subResource][allowed ? 'Allow' : 'Deny'])
                                        normalizedActions[subResource][allowed ? 'Allow' : 'Deny'] = [];
                                    normalizedActions[subResource][allowed ? 'Allow' : 'Deny'].push(`${iamActionPrefix}:${remap?.[action] ?? action}`);
                                }
                            })
                    });


                    return Object.entries(normalizedActions).flatMap(([subResource, permission]) => !subResource ?
                        Object.entries(permission).map(([permission, actions]) => ({
                            resources: resources,
                            actions: actions,
                            effect: permission
                        })) :
                        Object.entries(permission).map(([permission, actions]) => ({
                            resources: resources.map(r => r + `/${subResourceType}/` + subResource),
                            actions: actions,
                            effect: permission
                        }))
                    );
                })
            }

            const policy = {
                Version: "2012-10-17",
                Statement: [
                    ...getPolicyStatements(command.config.aws.permissions.dynamodb, 'arn:aws:dynamodb', 'table', 'index', 'dynamodb', ActionPermissionsRemap['dynamodb'], true),
                    ...getPolicyStatements(command.config.aws.permissions['dynamodb-stream'], 'arn:aws:dynamodb', 'table', 'index', 'dynamodb', ActionPermissionsRemap['dynamodb'], true),
                    ...getPolicyStatements(command.config.aws.permissions.lambda, 'arn:aws:lambda', 'function', null, 'lambda', ActionPermissionsRemap['lambda'], true),
                    ...getPolicyStatements(command.config.aws.permissions.bedrock, 'arn:aws:bedrock', 'foundation-model', null, 'bedrock', ActionPermissionsRemap['bedrock'], false),
                    ...getPolicyStatements(command.config.aws.permissions.sqs, 'arn:aws:sqs', '', null, 'sqs', ActionPermissionsRemap['sqs'], true),
                    ...getPolicyStatements(command.config.aws.permissions.cognito, 'arn:aws:cognito-idp', 'userpool', null, 'cognito-idp', ActionPermissionsRemap['cognito'], false),
                    ...getPolicyStatements(command.config.aws.permissions.s3, 'arn:aws:s3', '::', null, 's3', ActionPermissionsRemap['s3'], true),
                    ...getPolicyStatements(command.config.aws.permissions.location, 'arn:aws:geo', 'place-index', null, 'geo', ActionPermissionsRemap['location'], true),
                    ...getPolicyStatements(command.config.aws.permissions.routes, 'arn:aws:geo', 'route-calculator', null, 'geo', ActionPermissionsRemap['routes'], true),
                ]
            };

            result.resources.aws_iam_policy[command.name] = {
                name: functionName,
                policy: JSON.stringify(policy)
            };

            result.resources.aws_iam_role[command.name] = {
                name: functionName,
                assume_role_policy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: "",
                            Effect: "Allow",
                            Action: [
                                "sts:AssumeRole"
                            ],
                            Principals: [{
                                Type: 'Service',
                                Identifiers: ['lambda.amazonaws.com']
                            }]
                        }
                    ]
                })
            }

            result.resources.aws_iam_role_policy_attachment[command.name] = {
                role: functionName,
                policy_arn: `\${aws_iam_policy["${command.name}"].arn}`
            }


        }

        result.resources.aws_lambda[command.name] = {
            s3_bucket: "${aws_s3_bucket.deployment.id}",
            s3_key: "${aws_s3_object.s3container.key}",
            function_name: functionName,
            role: result.resources.aws_iam_role[command.name] ? `\${aws_iam_role.${command.name}.arn}` : "${var.role.arn}",

            memory_size: command.config.aws.memory ?? 1024,
            timeout: command.config.aws.timeout ?? 3,
            handler: "/opt/nodejs/node_modules/@akala/aws-lambda/dist/esm/handler.handler",
            publish: true,
            description: command.config.aws?.doc ?? command.config.doc?.description ?? "",

            tags: command.config.aws.tags ?? {},
            source_code_hash: "${aws_s3_object.s3container.source_hash}",
            layers: [
                "${aws_lambda_layer_version.command_dependencies.arn}"
            ],

            runtime: container.aws?.compatibleRuntimes[0] ?? [process.version],

            environment: {
                variables: {
                    AKALA_AWS: "env.AKALA_CMD",
                    AKALA_CMD: command.name,
                    NODE_OPTIONS: "--enable-source-maps",
                    NODE_ENV: "production",
                }
            },

        };

        if (command.config.aws.vpc)
            result.resources.aws_lambda[command.name]['vpc_config'] = {
                subnet_ids: ["${var.vpc_subnetid}"],
                security_group_ids: ["${var.vpc_securitygroupid}"]
            }
    })

    await fs.writeFile(join(outputPath, commandsName + '.tf.json'), JSON.stringify(result, null, 4));
}
async function walkTree(path: string, fileProcessor: (entry: Dirent, folder: string, root: string) => Promise<void>, root?: string)
{
    if (!root)
        root = path;

    const entries = await fs.readdir(path, { withFileTypes: true, recursive: true })
    await mapAsync(entries, async entry =>
    {
        if (entry.parentPath.includes('/node_modules/.bin'))
            return;
        if (entry.isFile())
            await fileProcessor(entry, path, root);
        else if (entry.isSymbolicLink())
        {
            const link = await fs.readlink(join(entry.parentPath, entry.name));
            await walkTree(join(entry.parentPath, link), fileProcessor, root);
        }
    }, true, true);
}

