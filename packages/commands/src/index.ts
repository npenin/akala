export * from './index.browser.js'
export * from './serve-metadata.js'
import serveMetadata, { ServeMetadata, connectByPreference } from './serve-metadata.js'
export { ServeMetadata, connectByPreference, serveMetadata };
import * as Triggers from './triggers/index.js'
import * as Metadata from './metadata/index.js'
import { Configurations, Configuration, GenericConfiguration, ExtendedConfigurations } from './metadata/index.js'
import { program, buildCliContext, buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container.js'
import { ICommandProcessor } from './model/processor.js'
import { registerCommands } from './generator.js'
import { DiscoveryOptions, FileSystem } from './processors/index.js'
import * as Processors from './processors/index.js'
export { Processors }
export { Triggers };

export { Configurations, Configuration, GenericConfiguration, ExtendedConfigurations }

import { handlers, HandlerResult, serverHandlers, ServerHandler } from './protocol-handler.js';
export { handlers as protocolHandlers, serverHandlers, ServerHandler, HandlerResult }

// import * as cli from './cli'
export { NetSocketAdapter } from './net-socket-adapter.js'
import commands from './commands.js'
import $metadata from './commands/$metadata.js'
import { stat } from 'fs/promises'
import { dirname } from 'path'
import { Logger, logger as LoggerBuilder, LogLevels } from '@akala/core'
export { default as serve, ServeOptions } from './cli/serve.js'
import * as FileGenerator from './cli/new.js';
import { Readable } from 'stream';

export { generatorPlugin as tsPluginHandler } from './cli/generate-metadata.js'
export { generatorPlugin as metadataPluginHandler } from './cli/generate.js'

export { FileGenerator };


export class Cli
{
    public readonly program: NamespaceMiddleware<{ [key: string]: string | number | boolean | string[]; }>;
    public readonly promise: Promise<unknown>;

    constructor(public readonly cliContainer: Container<void>, commands: Metadata.Container, processor: ICommandProcessor, program: NamespaceMiddleware)
    {
        registerCommands(commands.commands, processor, cliContainer);

        program.format(async r =>
        {
            if (r instanceof Readable)
            {
                r.pipe(process.stdout);
                return new Promise(resolve => r.addListener('close', resolve));
            } else
                return r;
        });
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

        const container = await FileSystem.discoverMetaCommands(commandsPath, options);
        return new Cli(cliContainer, container, options.processor, program);

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
