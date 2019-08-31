import * as akala from "./";
import { Container } from "./container";
import * as path from 'path'
import * as fs from 'fs';
import { Command } from "./command";

var cliContainer = new Container('cli', {});
cliContainer.register(new Command(async function ()
{
    var folder = process.argv[3] || process.cwd();
    var name = path.basename(folder);
    var container = new Container(name, {});
    var output: fs.WriteStream;
    output = fs.createWriteStream(process.argv[4] || 'commands.json');
    await akala.Processors.FileSystem.discoverCommands(process.argv[3] || process.cwd(), container);

    var meta = akala.metadata(container);
    output.write(JSON.stringify(meta, null, 4), function (err)
    {
        if (err)
            console.error(err);
        output.close();
    });

}, 'generate'));
if (require.main == module)
    cliContainer.dispatch(process.argv[2], ...process.argv.slice(3));
