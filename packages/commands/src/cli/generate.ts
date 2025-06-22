import * as path from 'path'
import { outputHelper } from '../new.js';
import { DiscoveryOptions } from "../processors/fs.js";
import { Metadata, Processors } from "../index.js";
import { MiddlewareCompositeAsync } from '@akala/core';
import { pathToFileURL } from 'url';
import fsHandler, { FileSystemProvider } from '@akala/fs';

export const generatorPlugin = new MiddlewareCompositeAsync<[options: Partial<DiscoveryOptions>, meta: Metadata.Container, outputFs: FileSystemProvider, outputFile: string]>();


export default async function generate(options: Partial<DiscoveryOptions>, folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();

    const folderUrl = !URL.canParse(folder) ? pathToFileURL(folder) : new URL(folder);

    const sourceFs = await fsHandler.process(folderUrl);

    if (!name && await sourceFs.access(path.join(folder, './package.json')).then(() => true, () => false))
        name = (await sourceFs.readFile<{ name: string }>('./package.json', { encoding: 'json' })).name;
    if (!name)
        name = path.basename(folder);

    let output: WritableStreamDefaultWriter;
    let outputFs: FileSystemProvider;
    const meta: Metadata.Container & { $schema?: string } = { name: name, commands: [] };
    ({ output, outputFile, outputFs } = await outputHelper(outputFile, 'commands.json', true, async (exists) =>
    {
        if (exists)
        {
            const existing = await outputFs.readFile<Metadata.Container>(outputFile, { encoding: 'json' });
            Object.assign(meta, { ...existing, name: meta.name || existing.name, commands: meta.commands || existing.commands })
        }
    }));

    const commands = await Processors.FileSystem.discoverMetaCommands(path.resolve(folder), {
        ...options, fs: outputFs, relativeTo: outputFs.root,
        isDirectory: true, recursive: true, ignoreFileWithNoDefaultExport: true,
        processor: new Processors.FileSystem(outputFs)
    });
    Object.assign(meta, commands);
    if (!commands.name && name)
        meta.name = name;
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json';

    try
    {
        await generatorPlugin.process(options, meta, outputFs, outputFile);
    }
    catch (e)
    {
        if (e)
            throw e;
    }

    await output.write(JSON.stringify(meta, null, 4));
    await output.close();
}
