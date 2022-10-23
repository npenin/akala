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
    ({ output, outputFile, outputFolder } = await outputHelper(outputFile, 'commands.json', true));

    var commands = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), { relativeTo: outputFolder, isDirectory: true, recursive: true, ignoreFileWithNoDefaultExport: true, processor: new akala.Processors.FileSystem(outputFolder) });

    const meta: akala.Metadata.Container & { $schema?: string } = { name: commands.name, commands, stateless: commands.stateless };
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala/master/packages/commands/container-schema.json';
    await write(output, JSON.stringify(meta, null, 4));
    await new Promise(resolve => output.end(resolve));
}