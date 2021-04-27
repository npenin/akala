export * from './model/command.js'
export * from './model/container.js'
export * from './decorators.js'
export * from './generator.js'
export * from './model/trigger.js'
export * from './model/processor.js'
export * from './model/error-unknowncommand.js'
import * as Processors from './processors/index.js'
import * as Triggers from './triggers/index.js'
import * as Metadata from './metadata/index.js'
import serveMetadata, { ServeMetadata, connectByPreference, connectWith, ConnectionPreference } from './serve-metadata.js'
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container.js'
import { Processor } from './model/processor.js'
import { registerCommands } from './generator.js'
import { DiscoveryOptions, FileSystem } from './processors/index.js'
// import * as cli from './cli.js'
export { Processors, Triggers, Metadata }
export { NetSocketAdapter, default as serve, ServeOptions } from './cli/serve.js'
export { serveMetadata, ServeMetadata, connectByPreference, connectWith, ConnectionPreference };
import commands from './commands.js'
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
