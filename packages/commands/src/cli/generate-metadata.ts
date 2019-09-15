import * as akala from "..";
import * as core from '@akala/core'
import { Container } from "../container";
import * as path from 'path'
import * as fs from 'fs';

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

    await write(output, 'declare module "@akala/commands" {\n');
    await write(output, '\tdeclare namespace description \n\t{\n');

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
        else
            await write(output, `, ...args:any[]`);
        await write(output, `): any\n`);

    });

    await write(output, '\t\t}\n');
    await write(output, '\t}\n');
    await write(output, '}\n');
};