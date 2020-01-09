#!/usr/bin/env node
import * as path from 'path'
import { Container, Processors } from '@akala/commands';
import yargs from 'yargs-parser'
import { lstatSync } from 'fs';
import { IpcStream } from './commands/start';

(async function (folder)
{
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

    var processor: Processors.FileSystem<any>;
    if (folderOrFile.isFile())
        processor = new Processors.FileSystem(cliContainer, path.dirname(folder));
    else
        processor = new Processors.FileSystem(cliContainer, folder);

    Processors.FileSystem.discoverCommands(folder, cliContainer, { processor: processor, isDirectory: folderOrFile.isDirectory() }).then(() =>
    {
        if (require.main == module)
        {
            cliContainer.attach('jsonrpc', new IpcStream(process));
            var args = yargs(process.argv.slice(3))
            cliContainer.dispatch(cliContainer.resolve('$init') || '$serve', { options: args, param: args._ });
        }
    });
})(process.argv[2]);