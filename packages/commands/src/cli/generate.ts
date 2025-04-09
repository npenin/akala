import * as path from 'path'
import * as fs from 'fs';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import { DiscoveryOptions } from "../processors/fs.js";
import { Metadata, Processors } from "../index.js";
import { MiddlewareCompositeAsync } from '@akala/core';

function importJson(path: string)
{
    return fs.promises.readFile(path, { encoding: 'utf-8', flag: 'r' }).then(JSON.parse)
}

export const generatorPlugin = new MiddlewareCompositeAsync<[options: Partial<DiscoveryOptions>, meta: Metadata.Container, outputFolder: string, outputFile: string]>();


export default async function generate(options: Partial<DiscoveryOptions>, folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();

    if (!name && fs.existsSync(path.join(folder, './package.json')))
        name = (await importJson(path.join(folder, './package.json'))).name;
    if (!name)
        name = path.basename(folder);

    let output: Writable;
    let outputFolder: string;
    const meta: Metadata.Container & { $schema?: string } = { name: name, commands: [] };
    ({ output, outputFile, outputFolder } = await outputHelper(outputFile, 'commands.json', true, async (exists) =>
    {
        if (exists)
        {
            const existing: Metadata.Container = await importJson(path.resolve(process.cwd(), outputFile));
            Object.assign(meta, { ...existing, name: meta.name || existing.name, commands: meta.commands || existing.commands })
        }
    }));

    const commands = await Processors.FileSystem.discoverMetaCommands(path.resolve(folder), Object.assign({ relativeTo: outputFolder, isDirectory: true, recursive: true, ignoreFileWithNoDefaultExport: true, processor: new Processors.FileSystem(outputFolder) }, options));
    Object.assign(meta, commands);
    if (!commands.name && name)
        meta.name = name;
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json';

    try
    {
        await generatorPlugin.process(options, meta, outputFolder, outputFile);
    }
    catch (e)
    {
        if (e)
            throw e;
    }

    await write(output, JSON.stringify(meta, null, 4));
    await new Promise(resolve => output.end(resolve));
}
