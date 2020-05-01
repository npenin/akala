#!/usr/bin/env node
import 'source-map-support/register'
import * as path from 'path'
import * as ac from '@akala/commands';
import yargs from 'yargs-parser'
import { lstatSync } from 'fs';
import { IpcAdapter } from './commands/start';
import debug from 'debug';
import mock from 'mock-require'

(async function (folder)
{
    const log = debug(folder);

    mock('@akala/commands', ac);
    mock('@akala/pm', require('..'));

    if (process.argv[2] == 'pm')
        folder = path.resolve(__dirname, '..')

    var folderOrFile = lstatSync(folder);
    if (folderOrFile.isFile() && path.extname(folder) == '.js')
    {
        require(folder);
        return;
    }

    var cliContainer: ac.Container<any>;
    if (folderOrFile.isFile())
        cliContainer = new ac.Container(path.basename(folder), {});
    else
        cliContainer = new ac.Container(folder, {});

    var processor: ac.Processor<any>;
    if (folderOrFile.isFile())
        processor = new ac.Processors.FileSystem(cliContainer, path.dirname(folder));
    else
        processor = new ac.Processors.FileSystem(cliContainer, folder);

    var args = yargs(process.argv.slice(3))
    if (args.v)
        processor = new ac.Processors.LogProcessor(processor, (cmd, params) =>
        {
            log({ cmd, params });
        });

    await ac.Processors.FileSystem.discoverCommands(folder, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
    if (require.main == module)
    {
        // cliContainer.attach('jsonrpc', new IpcStream(process));
        var init = cliContainer.resolve('$init');
        if (init && init.config && init.config.cli && init.config.cli.options)
            args = yargs(process.argv.slice(3), init.config.cli.options);
        var stop = await cliContainer.dispatch(init || '$serve', { options: args, param: args._, _trigger: 'cli', pm: new ac.Container('pm', new ac.Processors.JsonRpc(ac.Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer))) });

        if (stop && typeof stop == 'function')
            process.on('SIGINT', stop);
        process.on('SIGINT', () => process.exit());
    }

})(process.argv[2]);