#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import * as path from 'path'
import * as ac from '@akala/commands';
import { lstat } from 'fs/promises';
import { IpcAdapter } from './commands/start';
import debug from 'debug';
import mock from 'mock-require'
import { Socket } from 'net';
import { module as coreModule } from '@akala/core';
import program, { buildCliContextFromProcess, NamespaceMiddleware } from '@akala/cli';
import { Stats } from 'fs';
import { registerCommands } from '@akala/commands';

mock('@akala/commands', ac);
// eslint-disable-next-line @typescript-eslint/no-var-requires
mock('@akala/pm', require('..'));

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
let log: debug.Debugger;
const logMiddleware = new NamespaceMiddleware<{ program: string, name: string }>(null).option<string, 'verbose'>('verbose', { aliases: ['v',] });
logMiddleware.preAction(async c =>
{
    if (c.options.verbose)
        processor = new ac.Processors.LogProcessor(processor, (cmd, params) =>
        {
            log({ cmd, params });
            return Promise.resolve();
        });

    await ac.Processors.FileSystem.discoverCommands(c.options.program, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
});
const initMiddleware = new NamespaceMiddleware<{ program: string, name: string }>(null);
program.option<string, 'program'>('program', { needsValue: true }).option<string, 'name'>('name', { needsValue: true }).
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
            log = debug(c.options.name);

            if (folderOrFile.isFile())
                cliContainer = new ac.Container(path.basename(c.options.name), {});
            else
                cliContainer = new ac.Container(c.options.name, {});

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
            const init = cliContainer.resolve('$init');
            if (init && init.config && init.config.cli && init.config.cli.options)
                ac.Triggers.addCliOptions(init, initMiddleware);

            initMiddleware.option<string, 'pmSocket'>('pmSocket', { aliases: ['pm-socket'] }).action(async c =>
            {
                let pm: ac.Container<unknown>;
                if (!isPm)
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
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    registerCommands(require('../commands.json').commands, pm.processor, pm);
                }
                else
                    pm = cliContainer;

                coreModule('@akala/pm').register('container', pm);

                if (init)
                    await cliContainer.dispatch(init, { options: c.options, param: c.args, _trigger: 'cli', pm: pm, context: c });

                const serveArgs: ac.ServeMetadata = await pm.dispatch('connect', c.options.name);
                const stop = await cliContainer.dispatch('$serve', serveArgs) as (...args: unknown[]) => void;

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
    program.process(buildCliContextFromProcess());