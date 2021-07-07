import { Writable } from "stream";
import fs from 'fs';
import path from 'path';
import { promisify } from "util";
import { CliContext } from "@akala/cli";
import { Processors } from "..";

export async function outputHelper(outputFile: string | undefined, nameIfFolder: string, force: boolean)
{
    let output: Writable = undefined as any;
    let exists = false;
    if (!outputFile)
    {
        output = process.stdout;
        outputFile = '' as string;
    }
    else if (await promisify(fs.exists)(outputFile))
    {
        exists = true;

        if ((await fs.promises.lstat(outputFile)).isDirectory())
            outputFile = outputFile + '/' + nameIfFolder;
        else if (!force)
            throw new Error(`${outputFile} already exists. Use -f to force overwrite.`);

        if (!force && await promisify(fs.exists)(outputFile))
            throw new Error(`${outputFile} already exists. Use -f to force overwrite.`);

    }

    if (typeof output == 'undefined')
        output = fs.createWriteStream(outputFile);

    const outputFolder = path.dirname(outputFile);


    return { output, outputFolder, outputFile, exists };
}

export async function write(output: Writable, content: string)
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

export default async function _new(type: string, name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    console.error(arguments);
    switch (type)
    {
        case 'command':
        case 'cmd':
        case 'c':
            var { output } = await outputHelper(destination, name + '.ts', options && options.force);
            await write(output, `export default async function ${name}()
{

}`);
            break;
        case 'cc':
        case 'command-config':
            var cmds = await Processors.FileSystem.discoverMetaCommands(destination, { isDirectory: true, processor: new Processors.FileSystem(null, destination) });
            const cmd = cmds.find(c => c.name == name);
            var { output } = await outputHelper(path.resolve(destination, cmd?.config?.fs?.source && path.dirname(cmd?.config?.fs?.source)), name + '.json', options && options.force);
            await write(output, JSON.stringify({ $schema: "https://raw.githubusercontent.com/npenin/akala/master/packages/commands/command-schema.json", ...cmd.config }, null, 4));
            break;
        default:
            throw new Error(`${type} is not supported`);
    }
}