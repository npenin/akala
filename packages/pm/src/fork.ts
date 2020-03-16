#!/usr/bin/env node
import 'source-map-support/register'
import * as path from 'path'
import { Container, Processors, Processor } from '@akala/commands';
import yargs from 'yargs-parser'
import { lstatSync } from 'fs';
import { IpcAdapter } from './commands/start';
import debug from 'debug';

(async function (folder)
{
    const log = debug(folder)

    if (process.argv[2] == 'pm')
        folder = path.resolve(__dirname, './commands')

    var folderOrFile = lstatSync(folder);
    if (folderOrFile.isFile() && path.extname(folder) == '.js')
    {
        require(folder);
        return;
    }

    var cliContainer: Container<any>;
    if (folderOrFile.isFile())
        cliContainer = new Container(path.basename(folder), {});
    else
        cliContainer = new Container(folder, {});

    var processor: Processor<any>;
    if (folderOrFile.isFile())
        processor = new Processors.FileSystem(cliContainer, path.dirname(folder));
    else
        processor = new Processors.FileSystem(cliContainer, folder);

    var args = yargs(process.argv.slice(3))
    if (args.v)
        processor = new Processors.LogProcessor(processor, (cmd, params) =>
        {
            log({ cmd, params });
        });

    await Processors.FileSystem.discoverCommands(folder, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() });
    if (require.main == module)
    {
        // cliContainer.attach('jsonrpc', new IpcStream(process));
        var stop = await cliContainer.dispatch(cliContainer.resolve('$init') || '$serve', { options: args, param: args._, _trigger: 'fs', pm: new Container('pm', new Processors.JsonRpc(Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer))) });

        if (stop && typeof stop == 'function')
            process.on('SIGINT', stop);
        process.on('SIGINT', () => process.exit());
    }

})(process.argv[2]);