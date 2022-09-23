export * from './model/command'
export * from './model/container'
export * from './decorators'
export * from './generator'
export * from './model/trigger'
export * from './model/processor'
export * from './model/error-unknowncommand'
import * as Processors from './processors/index'
import * as Triggers from './triggers/index'
import * as Metadata from './metadata/index'
import serveMetadata, { ServeMetadata, connectByPreference, connectWith, ConnectionPreference, parseMetadata } from './serve-metadata'
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container'
import { CommandProcessor } from './model/processor'
import { registerCommands } from './generator'
import { DiscoveryOptions, FileSystem } from './processors/index'
// import * as cli from './cli'
export { Processors, Triggers, Metadata }
export { default as serve, ServeOptions } from './cli/serve'
export { NetSocketAdapter } from './net-socket-adapter'
export { serveMetadata, ServeMetadata, connectByPreference, connectWith, ConnectionPreference, parseMetadata };
import commands from './commands'
import $metadata from './commands/$metadata'
export { CommandProcessor };
export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Command[], processor: CommandProcessor, program: NamespaceMiddleware)
    {
        registerCommands(commands, processor, cliContainer);
        cliContainer.attach(Triggers.cli, this.program = program.command(null).options({ verbose: { aliases: ['v'] }, help: { needsValue: false } }));
    }

    public static async fromFileSystem(commandsPath: string, relativeTo: string): Promise<Cli>
    {
        const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined);

        const options: DiscoveryOptions = { processor: new FileSystem(relativeTo), relativeTo };
        cliContainer.processor.useMiddleware(51, options.processor);

        const commands = await FileSystem.discoverMetaCommands(commandsPath, options);
        return new Cli(cliContainer, commands, options.processor, program);

    }

    public async start(): Promise<unknown>
    {
        return this.program.process(buildCliContextFromProcess());
    }

    public static Metadata = $metadata;
}
