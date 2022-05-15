#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import * as path from 'path'
import * as ac from '@akala/commands';
import { lstat } from 'fs/promises';
import { IpcAdapter } from "./ipc-adapter";
import { Socket } from 'net';
import { logger, Logger, module as coreModule } from '@akala/core';
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'fs';
import { registerCommands, SelfDefinedCommand, parseMetadata } from '@akala/commands';

var isPm = false;

program.useMiddleware({
    handle: async c =>
    {
        isPm = c.options.program == 'pm';
        if (isPm)
            c.options.program = path.resolve(__dirname, '../commands.json');
    }
});
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
program.option<string, 'program'>('program', { needsValue: true }).option<string, 'name'>('name', { needsValue: true }).option<boolean, 'tls'>('tls', { needsValue: false }).
    use(async c => //If pure js file
    {
        folderOrFile = await lstat(c.options.program);
        if (!folderOrFile.isFile() || path.extname(c.options.program) !== '.js')
            throw undefined;

        return require(c.options.program);
    }).
    useMiddleware({
        handle: async c => //if commandable
        {
            log = logger(c.options.name);

            cliContainer = new ac.Container('cli', {});

            if (folderOrFile.isFile())
                processor = new ac.Processors.FileSystem(path.dirname(c.options.program));
            else
                processor = new ac.Processors.FileSystem(c.options.program);
        }
    }).
    useMiddleware(logMiddleware).
    useMiddleware({
        handle: async c =>
        {
            cliContainer.name = c.options.name;
            const init = cliContainer.resolve('$init');
            if (init && init.config && init.config.cli && init.config.cli.options)
                ac.Triggers.addCliOptions(init, initMiddleware);

            initMiddleware.option<string, 'pmSocket'>('pmSocket', { aliases: ['pm-socket', 'pm-sock'] }).action(async c =>
            {

                let pm: ac.Container<unknown>;
                let pmConnectInfo: ac.ServeMetadata;

                if (!isPm)
                {
                    const pmMeta = require('../commands.json');
                    if (process.connected)
                    {
                        pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer), true));
                    }
                    else
                    {
                        if (c.options.pmSocket)
                            pmConnectInfo = parseMetadata(c.options.pmSocket, c.options.tls);
                        else
                            pmConnectInfo = ac.serveMetadata('pm', { args: ['local'], options: {} })
                        const x = await ac.connectByPreference(pmConnectInfo, { metadata: pmMeta, container: cliContainer });
                        pm = x.container;
                        pm.processor.useMiddleware(20, x.processor);
                        // await new Promise<void>((resolve, reject) =>
                        // {
                        //     pmSocket.on('error', reject)
                        //     const remote = /^(?:([^:]+):)?(\d+)$/.exec(c.options.pmSocket);
                        //     if (!remote)
                        //     {
                        //         pmSocket.connect(c.options.pmSocket, resolve);
                        //     }
                        //     else
                        //     {
                        //         const host = remote[1];
                        //         const port = remote[2];
                        //         if (host)
                        //             pmSocket.connect(Number(port), host, resolve);
                        //         else
                        //             pmSocket.connect(Number(port), resolve);
                        //     }
                        // })
                        // pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new ac.NetSocketAdapter(pmSocket), cliContainer), true));
                    }
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    pm.unregister(ac.Cli.Metadata.name);
                    pm.register(ac.Metadata.extractCommandMetadata(ac.Cli.Metadata));
                    registerCommands(pmMeta.commands, null, pm);

                }
                else
                    pm = cliContainer;

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
                    await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', pm: pm, context: c });

                let stop: (...args: unknown[]) => Promise<void>;
                try
                {
                    const serveArgs: ac.ServeMetadata = await pm.dispatch('connect', c.options.name);
                    stop = await cliContainer.dispatch('$serve', serveArgs) as (...args: unknown[]) => Promise<void>;
                }
                catch (e)
                {
                    if (!e || e.statusCode !== 404)
                        throw e;
                    console.warn(e.message);
                }

                if (pm !== cliContainer)
                    await pm.dispatch('ready')

                if (stop && typeof stop == 'function')
                    process.on('SIGINT', stop);
                process.on('SIGINT', () => process.exit());
            });
        }
    })
    .useMiddleware(initMiddleware);

if (require.main == module)
    program.process(buildCliContextFromProcess()).catch(e =>
    {
        console.error(e);
        process.exit(1);
    });