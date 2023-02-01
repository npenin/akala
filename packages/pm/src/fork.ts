#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import * as path from 'path'
import * as ac from '@akala/commands';
import { lstat } from 'fs/promises';
import pmDef from './container.js';
import { IpcAdapter } from "./ipc-adapter.js";
import { logger, Logger, MiddlewareComposite, module as coreModule } from '@akala/core';
import program, { buildCliContextFromProcess, ErrorMessage, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'fs';
import { registerCommands, SelfDefinedCommand, parseMetadata, StructuredParameters } from '@akala/commands';

var isPm = false;

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
let initMiddleware = new NamespaceMiddleware<{ program: string, name: string, tls: boolean }>(null);
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
                isPm = c.options.name === 'pm' && c.options.program === require.resolve('../commands.json');
                const init = cliContainer.resolve('$init');
                if (init && init.config && init.config.cli && init.config.cli.options)
                {
                    if (init.config.cli.usage)
                        initMiddleware = initMiddleware.command(init.config.cli.usage, init.config?.doc?.description)
                    ac.Triggers.addCliOptions(init, initMiddleware);
                }

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

                initMiddleware.option<string, 'pmSocket'>('pmSocket', { aliases: ['pm-socket', 'pm-sock'], needsValue: true }).action(async c =>
                {
                    let pm: ac.Container<unknown> & pmDef.container;
                    let pmConnectInfo: ac.ServeMetadata;

                    if (!isPm)
                    {
                        //eslint-disable-next-line @typescript-eslint/no-var-requires
                        const pmMeta = require('../commands.json');
                        if (process.connected)
                        {
                            pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer), true)) as ac.Container<unknown> & pmDef.container;
                            registerCommands(pmMeta.commands, null, pm);
                        }
                        else
                        {
                            if (c.options.pmSocket)
                                pmConnectInfo = parseMetadata(c.options.pmSocket, c.options.tls);
                            else
                                pmConnectInfo = ac.serveMetadata('pm', { args: ['local'], options: {} })
                            const x = await ac.connectByPreference(pmConnectInfo, { metadata: pmMeta, container: cliContainer });
                            pm = x.container as ac.Container<unknown> & pmDef.container;
                            pm.processor.useMiddleware(20, x.processor);
                            const connect = pm.resolve('connect');
                            pm.unregister('connect');
                            pm.register(new SelfDefinedCommand((name: string, param: StructuredParameters<unknown[]>) =>
                            {
                                if (name == 'pm')
                                    return pmConnectInfo;
                                return x.processor.handle(pm, connect, param).then(e => { throw e }, r => r);
                            }, 'connect', [
                                "param.0",
                                "$param"
                            ]));
                        }
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        pm.unregister(ac.Cli.Metadata.name);
                        pm.register(ac.Metadata.extractCommandMetadata(ac.Cli.Metadata));
                    }
                    else
                        pm = cliContainer as pmDef.container & ac.Container<unknown>;

                    coreModule('@akala/pm').register('container', pm);

                    cliContainer.register(new SelfDefinedCommand(async (connectionId: string) =>
                    {
                        if (!pmConnectInfo)
                            pmConnectInfo = await pm.dispatch('connect', 'pm');
                        var pm2 = await ac.connectByPreference(pmConnectInfo, { container: cliContainer });
                        pm2.container.processor.useMiddleware(20, pm2.processor);
                        pm2.container.unregister(ac.Cli.Metadata.name);
                        pm2.container.register(ac.Metadata.extractCommandMetadata(ac.Cli.Metadata));
                        pm2.container.register(ac.Metadata.extractCommandMetadata(pm.resolve('bridge')));
                        if (await pm2.container.dispatch('bridge', connectionId))
                            throw undefined;
                    }, '$bridge'));

                    if (init)
                    {
                        await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', pm: pm, context: c, signal: controller.signal });
                    }


                    try
                    {
                        const serveArgs: ac.ServeMetadataWithSignal = await pm.dispatch('connect', c.options.name);
                        serveArgs.signal = controller.signal;
                        await cliContainer.dispatch('$serve', serveArgs);
                    }
                    catch (e)
                    {
                        if (!e || e.statusCode !== 404)
                            throw e;
                        console.warn(e.message);
                    }

                    if (pm !== cliContainer)
                        await pm.dispatch('ready')
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