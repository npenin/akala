import State from '../state.js';
import { Processors } from "@akala/commands";

export default async function alias(this: State, path: string, options?: { recursive?: boolean }): Promise<void>
{
    this.config.externals?.push(path);

    await Processors.FileSystem.discoverMetaCommands(path, options)
}