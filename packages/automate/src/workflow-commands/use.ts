import { CliContext } from "@akala/cli";
import { Container, Processors } from "@akala/commands";

export default async function use(this: CliContext, self: Container<CliContext>, name: string, pathToCommands: string)
{
    if (!name)
        var container = self;
    else
        var container = new Container(name, this);
    if (pathToCommands.startsWith('./'))
        await Processors.FileSystem.discoverCommands(pathToCommands, container);
    else
        await Processors.FileSystem.discoverCommands(require.resolve(pathToCommands), container);
    if (self && name)
        self.register(container);
    else
        return container;
}