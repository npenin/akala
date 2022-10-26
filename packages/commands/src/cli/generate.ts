import * as akala from "../";
import { Container } from '../model/container';
import * as path from 'path'
import * as fs from 'fs';
import { Writable } from "stream";
import { outputHelper, write } from './new';

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    if (!name && fs.existsSync(path.join(folder, './package.json')))
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        name = require(path.join(folder, './package.json')).name;
    if (!name)
        name = path.basename(folder);

    let output: Writable;
    let outputFolder: string;
    let exists: boolean;
    ({ output, outputFile, outputFolder, exists } = await outputHelper(outputFile, 'commands.json', true));
    const meta: akala.Metadata.Container & { $schema?: string } = { name: name, commands: [] };
    if (exists)
    {
        var existing: akala.Metadata.Container = require(path.resolve(process.cwd(), outputFile));
        delete require.cache[path.resolve(process.cwd(), outputFile)];
        meta.extends = existing.extends;
        meta.dependencies = existing.dependencies;
    }

    var commands = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), { relativeTo: outputFolder, isDirectory: true, recursive: true, ignoreFileWithNoDefaultExport: true, processor: new akala.Processors.FileSystem(outputFolder) });
    meta.commands = commands;
    if (commands.name)
        meta.name = commands.name;
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala/master/packages/commands/container-schema.json';
    await write(output, JSON.stringify(meta, null, 4));
    await new Promise(resolve => output.end(resolve));
}