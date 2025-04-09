import * as path from 'path'
import { DocConfiguration, jsonObject } from '../metadata/index.js';
import { FileSystemConfiguration } from '../processors/fs.js';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import { resolveToTypeScript } from './generate-ts-from-schema.js';
import { Metadata, Processors } from '../index.js';
import { eachAsync, MiddlewareCompositeWithPriorityAsync, toCamelCase } from '@akala/core';
import { JsonSchema } from '../jsonschema.js';

export const generatorPlugin = new MiddlewareCompositeWithPriorityAsync<[options: { name?: string, noContainer?: boolean; noProxy?: boolean; noStandalone?: boolean; noMetadata?: boolean; }, container: Metadata.Container, output: Writable, outputFolder: string, outputFile: string]>();

generatorPlugin.use(10, async (options, meta, output, outputFolder, outputFile) =>
{
    const types: Record<string, string> = {};

    if (!options?.noContainer)
    {
        await write(output, `\texport interface container \n\t{\n`);

        await eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

            if (cmd.config.fs?.disabled)
                return;

            await write(output, `\t\tdispatch (cmd:'${cmd.name}'`);
            if (cmd.config.fs)
            {
                const config = cmd.config.fs as jsonObject & FileSystemConfiguration;
                let filePath = path.relative(outputFolder, config.source || config.path);
                filePath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
                filePath = filePath.replace(/\\/g, '/');
                filePath += '.js'
                if (config.inject)
                {
                    await write(output, ', ...args: [');
                    const args: string[] = [];
                    config.inject.forEach((p, i) =>
                    {
                        if (typeof p === 'string')
                            if (p.startsWith('param.'))
                                args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await write(output, args.join(', '));
                    await write(output, `]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await write(output, `, ...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config.schema?.inject?.length)
            {
                await write(output, ', ...args: [');
                await write(output, (await Promise.all(cmd.config.schema.inject.map(async (p, i) => `arg${i}: ${await resolveToTypeScript(p as string | JsonSchema, { '#': cmd.config.schema as any }, types)}`))).join(', '));
                await write(output, `]): Promise<${await resolveToTypeScript(cmd.config.schema.resultSchema || 'unknown', { '#': cmd.config.schema as any }, types)}>\n`);
            }
            else if (cmd.config[""]?.inject?.length)
            {
                await write(output, cmd.config[""]?.inject.filter(p => typeof p == 'string' && p.startsWith('param.')).map(() => `, unknown`).join(''));
                await write(output, `): unknown\n`);
            }
            else
                await write(output, `, ...args: unknown[]): unknown\n`);

        });

        await write(output, '\t}\n');
    }


    if ((!options?.noProxy) && !outputFile.endsWith('.d.ts'))
    {
        await write(output, `\texport interface proxy \n\t{\n`);

        await eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

            if (cmd.config.fs?.disabled)
                return;

            await write(output, `\t\t'${cmd.name}'`);
            if (cmd.config.fs)
            {
                const config = cmd.config.fs as jsonObject & FileSystemConfiguration;
                let filePath = path.relative(outputFolder, config.source || config.path);
                filePath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
                filePath = filePath.replace(/\\/g, '/');
                filePath += '.js';
                if (config.inject)
                {
                    await write(output, '(...args: [');
                    const args: string[] = [];
                    config.inject.forEach((p, i) =>
                    {
                        if (typeof p == 'string' && p.startsWith('param.'))
                            args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await write(output, args.join(', '));
                    await write(output, `]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await write(output, `(...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config.schema?.inject?.length)
            {
                await write(output, `(`);
                await write(output, (await Promise.all(cmd.config.schema.inject.map(async (p, i) => `arg${i}: ${await resolveToTypeScript(p as string | JsonSchema, { '#': cmd.config.schema as any }, types)}`))).join(', '));
                await write(output, `): Promise<${await resolveToTypeScript(cmd.config.schema.resultSchema || 'unknown', { '#': cmd.config.schema as any }, types)}>\n`);
            }
            else if (cmd.config[""]?.inject?.length)
            {
                await write(output, cmd.config[""]?.inject.filter(p => typeof p == 'string' && p.startsWith('param.')).map((p) => `arg${(p as string).substring(6)}:any`).join(', '));
                await write(output, `): unknown\n`);
            }
            else
                await write(output, `(...args: unknown[]): unknown\n`);

        });

        await write(output, '\t}\n');
    }

    if (!options?.noMetadata)
    {
        await write(output, `   export const meta=${JSON.stringify(meta)} as Metadata.Container;\n\n`);

        if (!options?.noStandalone)
        {
            await write(output, `   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>(${JSON.stringify(options.name || 'container')}, void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }\n`);
        }
    }

    if (Object.keys(types).length)
    {
        for (const e of Object.entries(types))
        {
            await write(output, `export type ${e[0]}=${e[1]};\n`)
        }
    }

    throw undefined;
});
export default async function generate(name?: string, folder?: string, outputFile?: string, options?: { name?: string, noContainer?: boolean, noProxy?: boolean, noStandalone?: boolean, noMetadata?: boolean })
{
    folder = folder || process.cwd();
    if (!name)
        options.name = toCamelCase(path.basename(folder, path.extname(folder)));

    let output: Writable;
    let outputFolder: string;

    ({ output, outputFolder, outputFile } = await outputHelper(outputFile, 'commands.ts', true));

    const meta = await Processors.FileSystem.discoverMetaCommands(folder);

    let hasFs = !!meta.commands.find(cmd => !!cmd.config.fs);

    if (hasFs)
    {
        await write(output, `//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
`)
    }

    await write(output, 'import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";\n');

    if (outputFile.endsWith('.d.ts'))
        await write(output, 'declare namespace ' + options.name);
    else
    {
        await write(output, '// eslint-disable-next-line @typescript-eslint/no-namespace\n');
        await write(output, 'namespace ' + options.name);
    }
    await write(output, '\n{\n');

    try
    {
        await generatorPlugin.process(options, meta, output, outputFolder, outputFile)
    }
    catch (e)
    {
        if (e)
            throw e;
    }

    await write(output, '}\n');
    await write(output, '\n');
    await write(output, `export { ${options.name} as default };`);

    await new Promise(resolve => output.end(resolve));
}

async function writeDoc(output: Writable, argName: string, doc: DocConfiguration)
{
    await write(output, `\t\t/** 
\t\t  * ${doc.description?.split('\n').join('\n\t\t  * ')}`);
    if (doc.inject?.length)
    {
        for (const i in doc.inject)
            await write(output, `\n\t\t  * @typedef ${argName}${i} - ${doc.inject[i] as string}`)

        await write(output, `\n\t\t  * @param {[${doc.inject.map((_, i) => argName + i).join(', ')}]} ${argName}`)
    }

    await write(output, `\n\t\t  */\n`);
}
