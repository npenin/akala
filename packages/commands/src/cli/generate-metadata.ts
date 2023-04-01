import * as akala from '../index.js';
import * as core from '@akala/core'
import { Container } from '../model/container.js';
import * as path from 'path'
import { jsonObject } from '../metadata/index.js';
import { FileSystemConfiguration } from '../processors/fs.js';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import { createWriteStream } from 'fs';


export default async function generate(name?: string, folder?: string, outputFile?: string, options?: { noContainer?: boolean, noProxy?: boolean })
{
    folder = folder || process.cwd();
    if (!name)
        name = path.basename(folder, path.extname(folder));
    const container = new Container(name, {});

    let output: Writable;
    let outputFolder: string;

    ({ output, outputFolder, outputFile } = await outputHelper(outputFile, 'commands.ts', true));

    if (!output)
        output = createWriteStream(outputFile);

    await akala.Processors.FileSystem.discoverCommands(folder, container);

    const meta = akala.metadata(container);

    let hasFs = false;
    await core.eachAsync(meta.commands, async function (cmd)
    {
        if (cmd.config.fs)
        {
            hasFs = true;
        }
    });


    if (hasFs)
    {
        await write(output, '//eslint-disable-next-line @typescript-eslint/no-unused-vars\n');
        await write(output, 'import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from \'@akala/core\';\n')
    }

    if (outputFile.endsWith('.d.ts'))
        await write(output, 'declare namespace ' + name);
    else
    {
        await write(output, '// eslint-disable-next-line @typescript-eslint/no-namespace\n');
        await write(output, 'namespace ' + name);
    }
    await write(output, '\n{\n');

    if (!options || !options.noContainer)
    {
        await write(output, `\texport interface container \n\t{\n`);

        await core.eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

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
                        if (p.startsWith('param.'))
                            args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await write(output, args.join(', '));
                    await write(output, `]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await write(output, `, ...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config[""]?.inject && cmd.config[""]?.inject.length)
            {
                await write(output, cmd.config[""]?.inject.filter(p => p.startsWith('param.')).map(() => `any`).join(', '));
                await write(output, `): unknown\n`);
            }
            else
                await write(output, `, ...args: unknown[]): unknown\n`);

        });

        await write(output, '\t}\n');
    }


    if ((!options || !options.noProxy) && !outputFile.endsWith('.d.ts'))
    {
        await write(output, `\texport interface proxy \n\t{\n`);

        await core.eachAsync(meta.commands, async function (cmd)
        {
            if (cmd.config?.doc)
                await writeDoc(output, 'args', cmd.config.doc);

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
                        if (p.startsWith('param.'))
                            args.push(`Argument${i}<typeof import('./${filePath}').default>`)
                    })
                    await write(output, args.join(', '));
                    await write(output, `]): ReturnType<typeof import('./${filePath}').default>\n`);
                }
                else
                    await write(output, `(...args: Arguments<typeof import('./${filePath}').default>): ReturnType<typeof import('./${filePath}').default>\n`);
            }
            else if (cmd.config[""]?.inject && cmd.config[""]?.length)
            {
                await write(output, cmd.config[""]?.inject.filter(p => p.startsWith('param.')).map(() => `any`).join(', '));
                await write(output, `): unknown\n`);
            }
            else
                await write(output, `(...args: unknown[]): unknown\n`);

        });

        await write(output, '\t}\n');
    }

    await write(output, '}\n');
    await write(output, '\n');
    await write(output, `export { ${name} as default };`);
    await new Promise(resolve => output.end(resolve));
}

async function writeDoc(output: Writable, argName: string, doc: akala.Metadata.DocConfiguration)
{
    await write(output, `\t\t/** 
\t\t  * ${doc.description.split('\n').join('\n\t\t  * ')}`);
    if (doc.inject?.length)
    {
        for (const i in doc.inject)
            await write(output, `\n\t\t  * @typedef ${argName}${i} - ${doc.inject[i]}`)

        await write(output, `\n\t\t  * @param {[${doc.inject.map((_, i) => argName + i).join(', ')}]} ${argName}`)
    }

    await write(output, `\n\t\t  */\n`);
}
