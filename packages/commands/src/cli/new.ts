import { Writable } from "stream";
import fs from 'fs';
import path from 'path';
import { promisify } from "util";

export async function outputHelper(outputFile: string | undefined, nameIfFolder: string, force: boolean, actionIfExists?: (exists: boolean) => void | Promise<void>)
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

    const outputFolder = path.dirname(outputFile);

    if (actionIfExists)
        await actionIfExists(exists);

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