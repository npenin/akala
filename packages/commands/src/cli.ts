#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem, DiscoveryOptions } from "./processors/fs"
import commands from './commands'
import { registerCommands } from "./generator";
import * as Triggers from "./triggers";
import * as Metadata from "./metadata";
import program, { buildCliContextFromProcess, NamespaceMiddleware } from "@akala/cli";
import { Processor } from "./model/processor";

export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Command[], processor: Processor, program: NamespaceMiddleware)
    {
        registerCommands(commands, processor, cliContainer);
        cliContainer.attach(Triggers.cli, this.program = program.options({ verbose: { aliases: ['v'] } }).command(null));
    }

    public static async fromFileSystem(commandsPath: string, relativeTo: string): Promise<Cli>
    {
        const cliContainer: commands & Container<void> = new Container<void>('cli', undefined);

        const options: DiscoveryOptions = { processor: new FileSystem(cliContainer, relativeTo), relativeTo };

        const commands = await FileSystem.discoverMetaCommands(commandsPath, options);
        return new Cli(cliContainer, commands, options.processor, program);

    }

    public async start(): Promise<unknown>
    {
        return program.process(buildCliContextFromProcess());
    }
}

if (require.main == module)
    (async function ()
    {
        const cli = await Cli.fromFileSystem(path.resolve(__dirname, './cli'), path.join(__dirname, '../'));
        cli.program.useError(async (e, c) =>
        {
            if (c.options.verbose)
                console.error(e);
            else
                console.error(e['message'] || e);
        });
        await cli.start();

    })();