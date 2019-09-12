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
    output = fs.createWriteStream(outputFile || 'commands.json');
    await akala.Processors.FileSystem.discoverCommands(folder, container);

    var meta = akala.metadata(container);
    output.write(JSON.stringify(meta, null, 4), function (err)
    {
        if (err)
            console.error(err);
        output.close();
    });

};