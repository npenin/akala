#!/usr/bin/env node
import 'source-map-support/register'
import * as path from 'path'
import * as ac from '@akala/commands';
import { lstat } from 'fs/promises';
import { IpcAdapter } from './commands/start';
import debug from 'debug';
import mock from 'mock-require'
import { Socket } from 'net';
import { module as coreModule } from '@akala/core';
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'node:fs';

mock('@akala/commands', ac);
// eslint-disable-next-line @typescript-eslint/no-var-requires
mock('@akala/pm', require('..'));

program.useMiddleware({
    handle: async c =>
    {
        c.options.sidecar = c.args[0] == 'pm' && path.resolve(__dirname, '..') || c.args[0];
        return;
    }
});
let folderOrFile: Stats;
let cliContainer: ac.Container<unknown>;
let processor: ac.Processor;
let log: debug.Debugger;
const logMiddleware = new NamespaceMiddleware<{ sidecar: string }>(null).option<string, 'verbose'>('verbose', { aliases: ['v',] });
logMiddleware.action(async c =>
{

    if (c.options.verbose)
        processor = new ac.Processors.LogProcessor(processor, (cmd, params) =>
        {
            log({ cmd, params });
            return Promise.resolve();
        });

    await ac.Processors.FileSystem.discoverCommands(c.options.sidecar, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });

});
const initMiddleware = new NamespaceMiddleware<{ sidecar: string }>(null);
program.command<{ sidecar: string }>(null).
    use(async c => //If pure js file
    {
        folderOrFile = await lstat(c.options.sidecar);
        if (folderOrFile.isFile() && path.extname(c.options.sidecar) == '.js')
        {
            require(c.options.sidecar);
            return;
        }
    }).
    use(async c => //if commandable
    {
        log = debug(c.options.sidecar);

        if (folderOrFile.isFile())
            cliContainer = new ac.Container(path.basename(c.options.sidecar), {});
        else
            cliContainer = new ac.Container(c.options.sidecar, {});

        if (folderOrFile.isFile())
            processor = new ac.Processors.FileSystem(cliContainer, path.dirname(c.options.sidecar));
        else
            processor = new ac.Processors.FileSystem(cliContainer, c.options.sidecar);
    }).
    useMiddleware(logMiddleware).
    use(async c =>
    {
        const init = cliContainer.resolve('$init');
        if (init && init.config && init.config.cli && init.config.cli.options)
            ac.Triggers.addCliOptions(init, initMiddleware);

        initMiddleware.option<string, 'pmSocket'>('pmSocket', { aliases: ['pm-socket'] }).action(async c =>
        {
            let pm: ac.Container<unknown>;
            if (process.argv[2] != 'pm')
            {
                if (process.connected)
                {
                    pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer), true));
                }
                else
                {
                    const pmSocket = new Socket();
                    await new Promise<void>((resolve, reject) =>
                    {
                        pmSocket.on('error', reject)
                        pmSocket.connect(c.options.pmSocket, resolve);
                    })
                    pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new ac.NetSocketAdapter(pmSocket), cliContainer), true));
                }
            }
            else
                pm = cliContainer;

            coreModule('@akala/pm').register('container', pm);

            if (init)
                await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', pm: pm });

            const serveArgs: ac.ServeMetadata = await pm.dispatch('connect', c.options.sidecar);
            const stop = await cliContainer.dispatch('$serve', serveArgs) as (...args: unknown[]) => void;

            if (stop && typeof stop == 'function')
                process.on('SIGINT', stop);
            process.on('SIGINT', () => process.exit());
        });
    })
    .useMiddleware(initMiddleware);

if (require.main == module)
    program.handle(buildCliContextFromProcess());