import * as path from 'path'
import { type DocConfiguration, type jsonObject } from '../metadata/index.js';
import { type FileSystemConfiguration } from '../processors/fs.js';
import { outputHelper } from '../new.js';
import { resolveToTypeScript } from './generate-ts-from-schema.js';
import { Metadata, Processors } from '../index.js';
import { eachAsync, MiddlewareCompositeWithPriorityAsync, toCamelCase } from '@akala/core';
import { type JsonSchema } from '../jsonschema.js';
import { type FileSystemProvider } from '@akala/fs';
import { relative } from 'path/posix';

export const generatorPlugin = new MiddlewareCompositeWithPriorityAsync<[options: { name?: string, noContainer?: boolean; noProxy?: boolean; noStandalone?: boolean; noMetadata?: boolean; }, container: Metadata.Container, output: WritableStreamDefaultWriter, outputFs: FileSystemProvider, outputFile: string]>();


generatorPlugin.use(10, async (options, meta, output, outputFolder, outputFile) =>
{
    const types: Record<string, string> = {};

    if (!options?.noContainer)
    {
        await output.write(`\texport interface container \n\t{\n`);

        await eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

            if (cmd.config.fs?.disabled)
                return;

            await output.write(`\t\tdispatch (cmd:'${cmd.name}'`);
            if (cmd.config.fs)
            {
                const config = cmd.config.fs as jsonObject & FileSystemConfiguration;
                const filePath = relative(new URL('./', new URL(outputFile, outputFolder.root)).toString(), new URL(config.source || config.path, outputFolder.root).toString());

                if (config.inject)
                {
                    const arg = Array.isArray(config.inject) ? config.inject : [config.inject];

                    await output.write(', ...args: [');
                    const args: string[] = [];
                    arg.forEach((p, i) =>
                    {
                        if (typeof p === 'string')
                            if (p.startsWith('params.'))
                                args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await output.write(args.join(', '));
                    await output.write(`]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await output.write(`, ...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config.schema?.inject && (!Array.isArray(cmd.config.schema?.inject) || cmd.config.schema?.inject?.length))
            {
                const arg = Array.isArray(cmd.config.schema?.inject) ? cmd.config.schema?.inject : [cmd.config.schema?.inject];

                await output.write(', ...args: [');
                await output.write((await Promise.all(arg.map(async (p, i) => `arg${i}: ${await resolveToTypeScript(p as string | JsonSchema, { '#': cmd.config.schema as any }, types)}`))).join(', '));
                await output.write(`]): Promise<${await resolveToTypeScript(cmd.config.schema.resultSchema || 'unknown', { '#': cmd.config.schema as any }, types)}>\n`);
            }
            else if (!Array.isArray(cmd.config['']?.inject) || cmd.config[""]?.inject?.length)
            {
                const arg = Array.isArray(cmd.config['']?.inject) ? cmd.config['']?.inject : [cmd.config['']?.inject];
                await output.write(arg.filter(p => typeof p == 'string' && p.startsWith('params.')).map(() => `, unknown`).join(''));
                await output.write(`): unknown\n`);
            }
            else
                await output.write(`, ...args: unknown[]): unknown\n`);

        });

        await output.write('\t}\n');
    }


    if ((!options?.noProxy) && !outputFile.endsWith('.d.ts'))
    {
        await output.write(`\texport interface proxy \n\t{\n`);

        await eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

            if (cmd.config.fs?.disabled)
                return;

            await output.write(`\t\t'${cmd.name}'`);
            if (cmd.config.fs)
            {
                const config = cmd.config.fs as jsonObject & FileSystemConfiguration;
                const filePath = relative(new URL('./', new URL(outputFile, outputFolder.root)).toString(), new URL(config.source || config.path, outputFolder.root).toString());
                // filePath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
                // filePath = filePath.replace(/\\/g, '/');
                // filePath += '.js';
                if (config.inject)
                {
                    const arg = Array.isArray(config.inject) ? config.inject : [config.inject];
                    await output.write('(...args: [');
                    const args: string[] = [];
                    arg.forEach((p, i) =>
                    {
                        if (typeof p == 'string' && p.startsWith('params.'))
                            args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await output.write(args.join(', '));
                    await output.write(`]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await output.write(`(...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config.schema?.inject && (!Array.isArray(cmd.config.schema?.inject) || cmd.config.schema?.inject?.length))
            {
                const arg = Array.isArray(cmd.config.schema.inject) ? cmd.config.schema.inject : [cmd.config.schema.inject];

                await output.write(`(`);
                await output.write((await Promise.all(arg.map(async (p, i) => `arg${i}: ${await resolveToTypeScript(p as string | JsonSchema, { '#': cmd.config.schema as any }, types)}`))).join(', '));
                await output.write(`): Promise<${await resolveToTypeScript(cmd.config.schema.resultSchema || 'unknown', { '#': cmd.config.schema as any }, types)}>\n`);
            }
            else if (cmd.config['']?.inject && (!Array.isArray(cmd.config['']?.inject) || cmd.config[""]?.inject?.length))
            {
                const arg = Array.isArray(cmd.config[''].inject) ? cmd.config[''].inject : [cmd.config[''].inject];

                await output.write(arg.filter(p => typeof p == 'string' && p.startsWith('params.')).map((p) => `arg${(p as string).substring(6)}:any`).join(', '));
                await output.write(`): unknown\n`);
            }
            else
                await output.write(`(...args: unknown[]): unknown\n`);

        });

        await output.write('\t}\n');
    }

    if (!options?.noMetadata)
    {
        await output.write(`   export const meta=${JSON.stringify(meta)} as Metadata.Container;\n\n`);

        if (!options?.noStandalone)
        {
            await output.write(`   export function connect(processor?:ICommandProcessor) {
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
            await output.write(`export type ${e[0]}=${e[1]};\n`)
        }
    }

    throw undefined;
});
export default async function generate(name?: string, folder?: string, outputFile?: string, options?: { name?: string, noContainer?: boolean, noProxy?: boolean, noStandalone?: boolean, noMetadata?: boolean })
{
    folder = folder || process.cwd();
    if (!name)
        options.name = toCamelCase(path.basename(folder, path.extname(folder)));

    let output: WritableStreamDefaultWriter;
    let outputFs: FileSystemProvider;

    ({ output, outputFs, outputFile } = await outputHelper(outputFile, 'commands.ts', true));

    const meta = await Processors.FileSystem.discoverMetaCommands(folder);

    let hasFs = !!meta.commands.find(cmd => !!cmd.config.fs);

    if (hasFs)
    {
        await output.write(`//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
`)
    }

    await output.write('import {Metadata, type ICommandProcessor, Container, registerCommands} from "@akala/commands";\n');

    if (outputFile.endsWith('.d.ts'))
        await output.write('declare namespace ' + toCamelCase(options.name));
    else
    {
        await output.write('// eslint-disable-next-line @typescript-eslint/no-namespace\n');
        await output.write('namespace ' + toCamelCase(options.name));
    }
    await output.write('\n{\n');

    try
    {
        await generatorPlugin.process(options, meta, output, outputFs, outputFile)
    }
    catch (e)
    {
        if (e)
            throw e;
    }

    await output.write('}\n');
    await output.write('\n');
    await output.write(`export { ${toCamelCase(options.name)} as default };`);

    await output.close();
}

async function writeDoc(output: WritableStreamDefaultWriter, argName: string, doc: DocConfiguration)
{
    await output.write(`\t\t/** 
\t\t  * ${doc.description?.split('\n').join('\n\t\t  * ')}`);
    if (doc.inject)
        if (Array.isArray(doc.inject))
        {
            if (doc.inject?.length)
            {
                for (const i in doc.inject)
                    await output.write(`\n\t\t  * @typedef ${argName}${i} - ${doc.inject[i] as string}`)

                await output.write(`\n\t\t  * @param {[${doc.inject.map((_, i) => argName + i).join(', ')}]} ${argName}`)
            }
        }
        else
        {
            for (const i in doc.inject)
                await output.write(`\n\t\t  * @typedef ${argName} - ${doc.inject[i] as string}`)

            await output.write(`\n\t\t  * @param {[${argName}).join(', ')}]} ${argName}`)
        }

    await output.write(`\n\t\t  */\n`);
}
