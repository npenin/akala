import * as akala from "../";
import { Container } from "../container";
import * as path from 'path'
import * as fs from 'fs';

export default async function generate(folder?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    var name = path.basename(folder);
    var container = new Container(name, {});
    var output: fs.WriteStream;
    if (!outputFile || (await fs.promises.lstat(outputFile)).isDirectory())
        output = fs.createWriteStream(outputFile && outputFile + '/commands.json' || 'commands.json');
    else
        output = fs.createWriteStream(outputFile);

    await akala.Processors.FileSystem.discoverCommands(folder, container);

    var meta: akala.Metadata.Container & { $schema?: string } = akala.metadata(container);
    meta.$schema = 'https://raw.githubusercontent.com/npenin/akala-commands/master/schema.json';
    output.write(JSON.stringify(meta, null, 4), function (err)
    {
        if (err)
            console.error(err);
        output.close();
    });

};