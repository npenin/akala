import { CliContext } from "@akala/cli";
import { Container, Processors } from "@akala/commands";
import { isAbsolute, basename } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

export default async function use(this: CliContext, self: Container<CliContext>, name: string, pathToCommands: string | URL)
{
    let container: Container<CliContext>;
    if (!name)
        container = self;
    else
        container = new Container(name, this);

    if (pathToCommands instanceof URL || pathToCommands.startsWith('./') || isAbsolute(pathToCommands))
    {
        if (pathToCommands instanceof URL || pathToCommands.startsWith('file://'))
            pathToCommands = fileURLToPath(pathToCommands);
        if (basename(pathToCommands) == 'package.json')
            await Processors.FileSystem.discoverCommands(pathToCommands.substring(0, pathToCommands.length - 'package.json'.length), container);
        else
            await Processors.FileSystem.discoverCommands(pathToCommands, container);
    }
    else
        await Processors.FileSystem.discoverCommands(fileURLToPath(new URL(pathToCommands, pathToFileURL(process.cwd()).toString())), container);
    if (self && name)
        self.register(container);
    else
        return container;
}
