export * from './index.browser'
import * as Triggers from './triggers/index'
import * as Metadata from './metadata/index'
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container'
import { CommandProcessor } from './model/processor'
import { registerCommands } from './generator'
import { DiscoveryOptions, FileSystem } from './processors/index'
// import * as cli from './cli'
export { NetSocketAdapter } from './net-socket-adapter'
import commands from './commands'
import $metadata from './commands/$metadata'

export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;
    private promise: Promise<unknown>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Command[], processor: CommandProcessor, program: NamespaceMiddleware)
    {
        registerCommands(commands, processor, cliContainer);
        this.promise = cliContainer.attach(Triggers.cli, this.program = program);
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
        await this.promise;
        return await this.program.process(buildCliContextFromProcess());
    }

    public static Metadata = $metadata;
}
