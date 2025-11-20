/**
 * 
 * CONSIDER index.browser !!!
 * 
 */

export * from './index.browser.js'
import { program, buildCliContext, buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli'
import { Container } from './model/container.js'
import { type ICommandProcessor } from './model/processor.js'
import { registerCommands } from './generator.js'
import * as Processors from './processors/index.js'
import * as Triggers from './triggers/index.js'
export { Processors, Triggers }
export type { JsonSchema } from './jsonschema.js'

// import * as cli from './cli'
import './net-socket-adapter.js'
import commands from './commands.js'
import $metadata from './commands/$metadata.js'
import { type LoggerWrapper, logger as LoggerBuilder, LogLevels } from '@akala/core'
export { default as serve, type ServeOptions } from './cli/serve.js'
import * as FileGenerator from './new.js';
import { Readable } from 'stream';
import { Metadata } from './index.browser.js'
import { pathToFileURL } from 'url'
export { default as serveMetadata, connectByPreference } from './serve-metadata.js'
import fsHandler from '@akala/fs'


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

    public static async fromFileSystem(commandsPath: string, options?: string | Processors.DiscoveryOptions): Promise<Cli>
    {
        const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined);

        if (!options)
            options = { ignoreFileWithNoDefaultExport: true };
        if (typeof options === 'string')
            options = { relativeTo: URL.canParse(options) ? new URL(options) : pathToFileURL(options) };

        if (!options.processor)
        {
            if (!options.relativeTo)
            {
                const commandsURL = URL.canParse(commandsPath) ? new URL(commandsPath) : pathToFileURL(commandsPath);
                const fs = await fsHandler.process(commandsURL);
                const stats = await fs.stat(commandsPath);
                options.isDirectory = stats.isDirectory;

                if (!options.isDirectory)
                {
                    options.relativeTo = new URL('./', commandsURL);
                    fs.chroot(options.relativeTo);
                }
                else
                    options.relativeTo = commandsURL;
            }

            options.processor = new Processors.FileSystem(await fsHandler.process(options.relativeTo));
        }

        cliContainer.processor.useMiddleware(51, options.processor);

        const container = await Processors.FileSystem.discoverMetaCommands(commandsPath, options);
        return new Cli(cliContainer, container, options.processor, program);

    }

    public async start(logger?: LoggerWrapper, args?: string[]): Promise<unknown>
    {
        await this.promise;
        if (args)
        {
            if (process.env.NODE_ENV == 'production')
                logger = logger || LoggerBuilder.use(process.argv0, LogLevels.error);
            else
                logger = logger || LoggerBuilder.use(process.argv0, LogLevels.warn);

            return await this.program.process(Object.assign(buildCliContext(logger, ...args), { currentWorkingDirectory: process.cwd() }));
        }
        return await this.program.process(buildCliContextFromProcess());
    }

    public static Metadata = $metadata;
}

