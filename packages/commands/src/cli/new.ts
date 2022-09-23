import { Writable } from "stream";
import fs from 'fs';
import path from 'path';
import { promisify } from "util";
import { CliContext, ErrorWithStatus } from "@akala/cli";
import { Metadata, Processors } from "..";

export async function outputHelper(outputFile: string | undefined, nameIfFolder: string, force: boolean)
{
    let output: Writable = undefined;
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

export async function newCommandConfiguration(cmd: Metadata.Command, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var { output } = await outputHelper(path.resolve(destination, cmd.config?.fs?.source && path.dirname(cmd.config.fs.source)), cmd.name + '.json', options && options.force);
    if (cmd.config?.fs?.source)
        delete cmd.config.fs.source;
    if (cmd.config?.fs?.path)
        delete cmd.config.fs.path;
    await write(output, JSON.stringify({ $schema: "https://raw.githubusercontent.com/npenin/akala/master/packages/commands/command-schema.json", ...cmd.config }, null, 4));
}