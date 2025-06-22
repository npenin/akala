import { Writable } from "stream";
import { FileSystemProvider, FSFileSystemProvider } from "@akala/fs";
import { pathToFileURL } from "url";

export type Generator = { output: WritableStreamDefaultWriter, exists: false, outputFile: string, outputFs: FileSystemProvider } | { output?: WritableStreamDefaultWriter, exists: true, outputFile: string, outputFs: FileSystemProvider };

export async function outputHelper(outputFile: string | Writable | WritableStream | undefined, nameIfFolder: string, force: boolean, actionIfExists?: (exists: boolean, outputFs: FileSystemProvider) => boolean | Promise<boolean> | void | Promise<void>): Promise<Generator>
{
    let output: WritableStream = undefined;
    let exists = false;
    const outputFs = new FSFileSystemProvider(pathToFileURL(process.cwd() + '/'), false);

    if (!outputFile)
    {
        output = Writable.toWeb(process.stdout);
        outputFile = '';
    }
    else if (outputFile instanceof Writable)
    {
        output = Writable.toWeb(outputFile);
        outputFile = '';
    }
    else if (outputFile instanceof WritableStream)
    {
        output = outputFile;
        outputFile = '';
    }
    else
    {
        if (await outputFs.access(outputFile).then(() => true, () => false))
        {
            exists = true;

            if ((await outputFs.stat(outputFile)).isDirectory)
                outputFile = outputFile + '/' + nameIfFolder;
            else
                outputFs.chroot('./');

            if (!force)
                // if (await promisify(fs.exists)(outputFile))
                throw new Error(`${outputFile} already exists. Use -f to force overwrite.`);
            // else
            // {
            //     console.log(force)
            //     exists = false;
            // }
        }
    }

    if (actionIfExists)
    {
        const action = await actionIfExists(exists, outputFs)
        if (typeof (action) == 'boolean' && !action)
        {
            return { outputFs, outputFile, exists: exists as true };
        }

    };

    return { output: output?.getWriter() ?? outputFs.openWriteStream(outputFile).getWriter(), outputFs: outputFs, outputFile, exists };
}
