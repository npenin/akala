#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import * as path from 'path'
import { lstat } from 'fs/promises';
import pmDef from './container.js';
import { IpcAdapter } from "./ipc-adapter.js";
import { logger, Logger, module as coreModule, MiddlewareCompositeAsync } from '@akala/core';
import { program, buildCliContextFromProcess, ErrorMessage, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'fs';
import { Processors, Triggers, ServeMetadata, Cli, registerCommands, SelfDefinedCommand, StructuredParameters, Container, CommandProcessor, serveMetadata, connectByPreference, Metadata, $metadataCmd } from '@akala/commands';
import { fileURLToPath } from 'url';
import commands from './container.js';

var isPm = false;

program.option('help')
let folderOrFile: Stats;
let cliContainer: Container<unknown>;
let processor: CommandProcessor;
let log: Logger;
const logMiddleware = new NamespaceMiddleware<{ program: string, name: string, tls: boolean }>(null).option<string>()('verbose', { aliases: ['v',] });
logMiddleware.preAction(async c =>
{
    if (c.options.verbose)
        processor = new Processors.LogProcessor((_c, cmd, params) =>
        {
            log.verbose({ cmd, params });
            return undefined;
        });

    await Processors.FileSystem.discoverCommands(c.options.program, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
});
let initMiddleware = new NamespaceMiddleware<{ program: string, name: string, tls: boolean }>(null);
const controller = new AbortController();

program.option<string>()('program', { needsValue: true, normalize: true, positional: true, position: 0 }).
    option<string>()('name', { needsValue: true, positional: true, position: 1, optional: true }).
    option<boolean>()('tls', { needsValue: false }).
    option<string>()('configFile', { needsValue: false }).
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
        if (URL.canParse(c.options.program))
        {
            const url = new URL(c.options.program);
            if (url.protocol == 'file:')
                c.options.program = fileURLToPath(url);
            else
                throw new Error('remote commands are not yet supported');
        }

        folderOrFile = await lstat(c.options.program);
        if (folderOrFile.isFile() && path.extname(c.options.program) === '.js')
            return require(c.options.program);

        log = logger(c.options.name);

        cliContainer = new Container('cli', {});

        if (folderOrFile.isFile())
            processor = new Processors.FileSystem(path.dirname(c.options.program));
        else
            processor = new Processors.FileSystem(c.options.program);
    }).
    useMiddleware(null, MiddlewareCompositeAsync.new(logMiddleware,
        {
            handle: async c =>
            {
                cliContainer.name = c.options.name;
                isPm = c.options.name === 'pm' && 'file://' + c.options.program === new URL('../../commands.json', import.meta.url).toString();
                const init = cliContainer.resolve('$init');
                if (init && init.config && init.config.cli && init.config.cli.options)
                {
                    if (init.config.cli.usage)
                    {
                        initMiddleware = initMiddleware.command(init.config.cli.usage, init.config?.doc?.description)
                        c.args.unshift('$init');
                    }
                    Triggers.addCliOptions(init, initMiddleware);
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

                initMiddleware.option<string>()('pmSocket', { aliases: ['pm-socket', 'pm-sock'], needsValue: true }).action(async c =>
                {
                    let pm: Container<unknown> & pmDef.container;
                    let pmConnectInfo: ServeMetadata;

                    if (!isPm)
                    {
                        //eslint-disable-next-line @typescript-eslint/no-var-requires
                        const pmMeta = commands.meta;
                        if (process.connected)
                        {
                            pm = new Container('pm', null, new Processors.JsonRpc(Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer))) as Container<unknown> & pmDef.container;
                            registerCommands(pmMeta.commands, null, pm);
                        }
                        else
                        {
                            if (c.options.pmSocket)
                                pmConnectInfo = { [c.options.pmSocket]: {} };
                            else
                                pmConnectInfo = serveMetadata({ args: ['local'], options: { socketName: 'pm' } })
                            const x = await connectByPreference(pmConnectInfo, { metadata: pmMeta, signal: controller.signal, container: cliContainer });
                            // controller.signal.addEventListener('abort', () => x.processor)
                            pm = x.container as Container<unknown> & pmDef.container;
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
                        pm.unregister(Cli.Metadata.name);
                        pm.register(Metadata.extractCommandMetadata(Cli.Metadata));
                    }
                    else
                        pm = cliContainer as pmDef.container & Container<unknown>;

                    coreModule('@akala/pm').register('container', pm);

                    cliContainer.register(new SelfDefinedCommand(async (connectionId: string) =>
                    {
                        if (!pmConnectInfo)
                            pmConnectInfo = await pm.dispatch('connect', 'pm');
                        var pm2 = await connectByPreference(pmConnectInfo, { metadata: await cliContainer.dispatch('$metadata'), container: cliContainer });
                        pm2.container.processor.useMiddleware(20, pm2.processor);
                        pm2.container.unregister($metadataCmd.name);
                        pm2.container.register($metadataCmd);
                        pm2.container.register(Metadata.extractCommandMetadata(pm.resolve('bridge')));
                        if (!await pm2.container.dispatch('bridge', connectionId))
                            throw new Error('connection could not be established');
                    }, '$bridge', ['param.0']));

                    if (init)
                    {
                        await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', pm: pm, context: c, signal: controller.signal });
                    }


                    try
                    {
                        const serveArgs = await pm.dispatch('connect', c.options.name);
                        // console.log(serveArgs)
                        // serveArgs.signal = controller.signal;
                        await cliContainer.dispatch('$serve', serveArgs, controller.signal);
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

program.process(buildCliContextFromProcess()).catch(e =>
{
    setImmediate(() => controller.abort(e));
});