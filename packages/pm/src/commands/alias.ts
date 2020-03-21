import State from "../state";
import { Processors, Container } from "@akala/commands";

export default async function alias(this: State, container: Container<State>, path: string, options?: { recursive?: boolean })
{
    this.config.externals?.push(path);

    Processors.FileSystem.discoverMetaCommands(path, options)
}