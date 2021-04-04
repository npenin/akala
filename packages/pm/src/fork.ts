#!/usr/bin/env node
import 'source-map-support/register'
import * as path from 'path'
import * as ac from '@akala/commands';
import yargs from 'yargs-parser'
import { lstatSync } from 'fs';
import { IpcAdapter } from './commands/start';
import debug from 'debug';
import mock from 'mock-require'
import { Socket } from 'net';
import { module as coreModule } from '@akala/core';

(async function (folder)
{
    const log = debug(folder);

    mock('@akala/commands', ac);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mock('@akala/pm', require('..'));

    if (process.argv[2] == 'pm')
        folder = path.resolve(__dirname, '..')

    const folderOrFile = lstatSync(folder);
    if (folderOrFile.isFile() && path.extname(folder) == '.js')
    {
        require(folder);
        return;
    }

    let cliContainer: ac.Container<unknown>;
    if (folderOrFile.isFile())
        cliContainer = new ac.Container(path.basename(folder), {});
    else
        cliContainer = new ac.Container(folder, {});

    let processor: ac.Processor;
    if (folderOrFile.isFile())
        processor = new ac.Processors.FileSystem(cliContainer, path.dirname(folder));
    else
        processor = new ac.Processors.FileSystem(cliContainer, folder);

    let args = yargs(process.argv.slice(3))
    if (args.v)
        processor = new ac.Processors.LogProcessor(processor, (cmd, params) =>
        {
            log({ cmd, params });
            return Promise.resolve();
        });

    await ac.Processors.FileSystem.discoverCommands(folder, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
    if (require.main == module)
    {
        // cliContainer.attach('jsonrpc', new IpcStream(process));
        const init = cliContainer.resolve('$init');
        if (init && init.config && init.config.cli && init.config.cli.options)
            args = yargs(process.argv.slice(3), init.config.cli.options);
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
                    pmSocket.connect(args.pmSocket, resolve);
                })
                pm = new ac.Container('pm', null, new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new ac.NetSocketAdapter(pmSocket), cliContainer), true));
            }
        }
        else
            pm = cliContainer;

        coreModule('@akala/pm').register('container', pm);
        if (init)
            await cliContainer.dispatch(init, { options: args, param: args._, _trigger: 'cli', pm: pm });

        const serveArgs: ac.ServeMetadata = await pm.dispatch('connect', process.argv[2]);
        const stop = await cliContainer.dispatch('$serve', serveArgs) as (...args: unknown[]) => void;

        if (stop && typeof stop == 'function')
            process.on('SIGINT', stop);
        process.on('SIGINT', () => process.exit());
    }

})(process.argv[2]);