import { CliContext } from "@akala/cli";
import { Container, Processors } from "@akala/commands";
import { isAbsolute, basename } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

export default async function use(this: CliContext, self: Container<CliContext>, name: string, pathToCommands: string)
{
    if (!name)
        var container = self;
    else
        var container = new Container(name, this);
    if (pathToCommands.startsWith('./') || isAbsolute(pathToCommands))
    {
        if (basename(pathToCommands) == 'package.json')
            await Processors.FileSystem.discoverCommands(pathToCommands.substring(0, pathToCommands.length - 'package.json'.length), container);
        else
            await Processors.FileSystem.discoverCommands(pathToCommands, container);
    }
    else
        await Processors.FileSystem.discoverCommands(fileURLToPath(new URL(pathToCommands, pathToFileURL(process.cwd()))), container);
    if (self && name)
        self.register(container);
    else
        return container;
}