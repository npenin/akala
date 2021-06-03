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
import serveMetadata, { ServeMetadata, connectByPreference, connectWith, ConnectionPreference } from './serve-metadata'
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container'
import { Processor } from './model/processor'
import { registerCommands } from './generator'
import { DiscoveryOptions, FileSystem } from './processors/index'
// import * as cli from './cli'
export { Processors, Triggers, Metadata }
export { NetSocketAdapter, default as serve, ServeOptions } from './cli/serve'
export { serveMetadata, ServeMetadata, connectByPreference, connectWith, ConnectionPreference };
import commands from './commands'
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
        return this.program.process(buildCliContextFromProcess());
    }
}
