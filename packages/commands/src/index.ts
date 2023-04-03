export * from './index.browser.js'
export * from './serve-metadata.js'
import serveMetadata, { ServeMetadata, connectByPreference, connectWith } from './serve-metadata.js'
export { ServeMetadata, connectByPreference, connectWith, serveMetadata };
import * as Triggers from './triggers/index.js'
import * as Metadata from './metadata/index.js'
import program, { buildCliContext, buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container.js'
import { CommandProcessor } from './model/processor.js'
import { registerCommands } from './generator.js'
import { DiscoveryOptions, FileSystem } from './processors/index.js'
// import * as cli from './cli'
export { NetSocketAdapter } from './net-socket-adapter.js'
import commands from './commands.js'
import $metadata from './commands/$metadata.js'
import { stat } from 'fs/promises'
import { dirname } from 'path'
import { Logger, logger as LoggerBuilder, LogLevels } from '@akala/core'
export { default as serve, ServeOptions, serverHandlers, ServerHandler, getOrCreateServerAndListen, getOrCreateSecureServerAndListen } from './cli/serve.js'


export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;
    private promise: Promise<unknown>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Command[], processor: CommandProcessor, program: NamespaceMiddleware)
    {
        registerCommands(commands, processor, cliContainer);
        this.promise = cliContainer.attach(Triggers.cli, this.program = program);
    }

    public static async fromFileSystem(commandsPath: string, options?: string | DiscoveryOptions): Promise<Cli>
    {
        const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined);

        if (!options)
            options = { ignoreFileWithNoDefaultExport: true };
        if (typeof options === 'string')
            options = { relativeTo: options };

        if (!options.processor)
        {
            if (!options.relativeTo)
            {
                const stats = await stat(commandsPath);
                options.isDirectory = stats.isDirectory();

                if (!options.isDirectory)
                    options.relativeTo = dirname(commandsPath);
                else
                    options.relativeTo = commandsPath;
            }

            options.processor = new FileSystem(options.relativeTo);
        }

        cliContainer.processor.useMiddleware(51, options.processor);

        const commands = await FileSystem.discoverMetaCommands(commandsPath, options);
        return new Cli(cliContainer, commands, options.processor, program);

    }

    public async start(logger?: Logger, args?: string[]): Promise<unknown>
    {
        await this.promise;
        if (args)
        {
            if (process.env.NODE_ENV == 'production')
                logger = logger || LoggerBuilder(process.argv0, LogLevels.error);
            else
                logger = logger || LoggerBuilder(process.argv0, LogLevels.warn);

            return await this.program.process(Object.assign(buildCliContext(logger, ...args), { currentWorkingDirectory: process.cwd() }));
        }
        return await this.program.process(buildCliContextFromProcess());
    }

    public static Metadata = $metadata;
}
