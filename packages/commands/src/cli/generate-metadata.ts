import * as akala from "..";
import * as core from '@akala/core'
import { Container } from "../container";
import * as path from 'path'
import * as fs from 'fs';
import { jsonObject } from "../metadata";
import { FileSystemConfiguration } from "../processors/fs-browser";

async function write(output: fs.WriteStream, content: string)
{
    return new Promise<void>((resolve, reject) =>
    {
        output.write(content, function (err)
        {
            if (err)
                reject(err);
            else
                resolve();
        })
    })
}

function camelCase(s: string)
{
    return s.replace(/-[A-Z]/g, function (s)
    {
        return s[1].toUpperCase();
    });
}

export default async function generate(name: string, folder?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    if (!name)
        name = path.basename(folder, path.extname(folder));
    var container = new Container(name, {});
    var output: fs.WriteStream;
    output = fs.createWriteStream(outputFile || 'commands.d.ts');
    await akala.Processors.FileSystem.discoverCommands(folder, container);

    var meta = akala.metadata(container);

    var hasFs = false;
    await core.eachAsync(meta.commands, async function (cmd)
    {
        if (cmd.config.fs)
        {
            hasFs = true;
        }
    });


    if (hasFs)
    {
        await write(output, 'declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;\n');
    }

    await write(output, 'declare module "@akala/commands" {\n');
    await write(output, '\texport namespace description \n\t{\n');

    await write(output, `\t\texport interface ${name} \n\t\t{\n`);

    await core.eachAsync(meta.commands, async function (cmd)
    {

        await write(output, `\t\t\tdispatch (cmd:'${cmd.name}'`);
        if (cmd.inject && cmd.inject.length)
        {
            await core.eachAsync(cmd.inject, async function (i)
            {
                await write(output, `, ${i}`);
            });
        }
        else if (cmd.config.fs)
        {
            let config = cmd.config.fs as jsonObject & FileSystemConfiguration;
            await write(output, `, ...args:Arguments<typeof import('./${config.path.replace(/\\/g, '/')}').default>`);
        }
        else
            await write(output, `, ...args:any[]`);
        await write(output, `): any\n`);

    });

    await write(output, '\t\t}\n');
    await write(output, '\t}\n');
    await write(output, '}\n');
};