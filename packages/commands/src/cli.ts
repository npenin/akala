#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem, DiscoveryOptions } from "./processors/fs"
import commands from './commands'
import { registerCommands } from "./generator";
import { Triggers } from ".";
import program, { buildCliContextFromProcess, CliContext, NamespaceMiddleware } from "@akala/cli";

const cliContainer: commands & Container<void> = new Container<void>('cli', undefined);

export const container: Promise<commands> = (async function ()
{
    const root = path.resolve(__dirname, './cli');
    const options: DiscoveryOptions = { processor: new FileSystem(cliContainer, path.join(__dirname, '../')), relativeTo: path.join(__dirname, '../') };

    const commands = await FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor, cliContainer);
    const cli = new NamespaceMiddleware(null);
    program.options({ verbose: { aliases: ['v'] } }).useMiddleware({
        handle(c)
        {
            return cli.handle(c).then(e =>
            {
                if (c.options.verbose)
                    console.error(e);
                else
                    console.error(e['message'] || e);
            })
        }
    });

    if (require.main == module)
    {
        await cliContainer.attach(Triggers.cli, cli);
        await program.process(buildCliContextFromProcess());
    }

    return cliContainer;
})()