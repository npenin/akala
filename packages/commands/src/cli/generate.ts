import * as akala from "../";
import { Container } from "../model/container";
import * as path from 'path'
import * as fs from 'fs';
import { join } from "path";
import { Writable } from "stream";

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    if (!name && fs.existsSync(join(folder, './package.json')))
        name = require(join(folder, './package.json')).name;
    if (!name)
        name = path.basename(folder);
    var container = new Container(name, {});

    var output: Writable;
    if (!outputFile)
        output = process.stdout;
    else if (fs.existsSync(outputFile) && fs.lstatSync(outputFile).isDirectory())
        output = fs.createWriteStream(outputFile + '/commands.json');
    else
        output = fs.createWriteStream(outputFile);

    await akala.Processors.FileSystem.discoverCommands(folder, container);

    var meta: akala.Metadata.Container & { $schema?: string } = akala.metadata(container);
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala-commands/master/schema.json';
    output.write(JSON.stringify(meta, null, 4), function (err)
    {
        if (err)
            console.error(err);
        output.end();
    });

};