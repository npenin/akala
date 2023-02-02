export * from './index.browser.js'
import * as Triggers from './triggers/index.js'
import * as Metadata from './metadata/index.js'
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container.js'
import { CommandProcessor } from './model/processor.js'
import { registerCommands } from './generator.js'
import { DiscoveryOptions, FileSystem } from './processors/index.js'
// import * as cli from './cli'
export { NetSocketAdapter } from './net-socket-adapter.js'
import commands from './commands.js'
import $metadata from './commands/$metadata.js'

export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;
    private promise: Promise<unknown>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Command[], processor: CommandProcessor, program: NamespaceMiddleware)
    {
        registerCommands(commands, processor, cliContainer);
        this.promise = cliContainer.attach(Triggers.cli, this.program = program);
    }

    public static async fromFileSystem(commandsPath: string, options: string | DiscoveryOptions): Promise<Cli>
    {
        const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined);

        if (!options)
            options = {};
        if (typeof options === 'string')
            options = { relativeTo: options };
        if (!options.processor)
            options.processor = new FileSystem(options.relativeTo);

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
