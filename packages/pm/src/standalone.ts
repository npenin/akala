#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import * as path from 'path'
import * as ac from '@akala/commands';
import { lstat } from 'fs/promises';
import { logger, Logger, MiddlewareComposite, module as coreModule } from '@akala/core';
import program, { buildCliContextFromProcess, ErrorMessage, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'fs';

program.option('help')
let folderOrFile: Stats;
let cliContainer: ac.Container<unknown>;
let processor: ac.CommandProcessor;
let log: Logger;
const logMiddleware = new NamespaceMiddleware<{ program: string, name: string, tls: boolean }>(null).option<string, 'verbose'>('verbose', { aliases: ['v',] });
logMiddleware.preAction(async c =>
{
    if (c.options.verbose)
        processor = new ac.Processors.LogProcessor(processor, (cmd, params) =>
        {
            log.verbose({ cmd, params });
            return Promise.resolve();
        });

    await ac.Processors.FileSystem.discoverCommands(c.options.program, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
});
const initMiddleware = new NamespaceMiddleware<{ program: string, name: string, tls: boolean }>(null);
const controller = new AbortController();

program.option<string, 'program'>('program', { needsValue: true, normalize: true }).
    option<string, 'name'>('name', { needsValue: true }).
    option<boolean, 'tls'>('tls', { needsValue: false }).
    options<{
        port?: number,
        tcpPort?: string,
        cert?: string,
        key?: string,
    }>({
        port: { needsValue: true, doc: 'http/ws port\n(default: 80 if http, 443 is certificate and key are provided)', aliases: ['p'], optional: true, caseSensitive: false },
        tcpPort: { needsValue: true, doc: 'tcp port', aliases: ['tcp-port'], optional: true, caseSensitive: false },
        cert: { needsValue: true, doc: 'public certificate', aliases: ['certificate'], optional: true, caseSensitive: false },
        key: { needsValue: true, doc: 'private certificate key. Requires public certificate', aliases: ['certificate-key'], optional: true, caseSensitive: false }
    }).
    preAction(async c => //If pure js file
    {
        folderOrFile = await lstat(c.options.program);
        if (folderOrFile.isFile() && path.extname(c.options.program) === '.js')
            return require(c.options.program);

        log = logger(c.options.name);

        cliContainer = new ac.Container('cli', {});

        if (folderOrFile.isFile())
            processor = new ac.Processors.FileSystem(path.dirname(c.options.program));
        else
            processor = new ac.Processors.FileSystem(c.options.program);
    }).
    useMiddleware(null, MiddlewareComposite.new(logMiddleware,
        {
            handle: async c =>
            {
                cliContainer.name = c.options.name;
                const init = cliContainer.resolve('$init');
                if (init && init.config && init.config.cli && init.config.cli.options)
                    ac.Triggers.addCliOptions(init, initMiddleware);

                process.on('unhandledRejection', (x) =>
                {
                    controller.abort(x)
                    return false;
                });
                process.on('uncaughtException', (x) =>
                {
                    controller.abort(x)
                    return false;
                });
                process.on('SIGINT', () => controller.abort(null));

                initMiddleware.action(async c =>
                {
                    if (init)
                        await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', context: c });
                });
            }
        },
        initMiddleware));

controller.signal.addEventListener('abort', function () 
{
    if (this.reason)
    {
        process.exitCode = 1;
        if (this.reason instanceof ErrorMessage)
            console.error(this.reason.message);
        else
            console.error(this.reason);
    }
})

if (require.main == module)
    program.process(buildCliContextFromProcess()).catch(e =>
    {
        setImmediate(() => controller.abort(e));
    });