import { Writable } from "stream";
import fs from 'fs';
import path from 'path';
import { promisify } from "util";

export type Generator = { output: Writable, exists: false, outputFile: string, outputFolder: string } | { output?: Writable, exists: true, outputFile: string, outputFolder: string };

export async function outputHelper(outputFile: string | Writable | undefined, nameIfFolder: string, force: boolean, actionIfExists?: (exists: boolean) => boolean | Promise<boolean> | void | Promise<void>): Promise<Generator>
{
    let output: Writable = undefined;
    let exists = false;
    if (!outputFile)
    {
        output = process.stdout;
        outputFile = '';
    }
    else if (outputFile instanceof Writable)
    {
        output = outputFile;
        outputFile = '';
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
        else
            exists = false;
    }

    const outputFolder = path.dirname(outputFile);

    if (actionIfExists)
    {
        const action = await actionIfExists(exists)
        if (typeof (action) == 'boolean' && !action)
        {
            return { outputFolder, outputFile, exists: exists as true };
        }

    };

    if (!output)
        output = fs.createWriteStream(outputFile);


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

export async function close(output: Writable)
{
    return new Promise<void>((resolve) =>
    {
        output.end(function ()
        {
            resolve();
        })
    })
}