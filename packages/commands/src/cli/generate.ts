import * as akala from "../";
import { Container } from "../model/container";
import * as path from 'path'
import * as fs from 'fs';
import { join } from "path";
import { Writable } from "stream";
import { outputHelper } from "./new";

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    if (!name && fs.existsSync(join(folder, './package.json')))
        name = require(join(folder, './package.json')).name;
    if (!name)
        name = path.basename(folder);
    var container = new Container(name, {});

    var output: Writable;
    var outputFolder: string;
    ({ output, outputFile, outputFolder } = await outputHelper(outputFile, 'commands.json', true));

    await akala.Processors.FileSystem.discoverCommands(path.resolve(folder), container, { relativeTo: outputFolder, isDirectory: true });

    var meta: akala.Metadata.Container & { $schema?: string } = akala.metadata(container);
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala-commands/master/schema.json';
    output.write(JSON.stringify(meta, null, 4), function (err)
    {
        if (err)
            console.error(err);
        output.end();
    });
};