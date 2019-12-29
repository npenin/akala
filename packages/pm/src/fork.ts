#!/usr/bin/env node
import * as path from 'path'
import { Container, Processors } from '@akala/commands';
import yargs from 'yargs-parser'
import { lstatSync } from 'fs';

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

    var cliContainer = new Container(folder, {});

    if (folderOrFile.isFile())
        cliContainer.processor = new Processors.FileSystem(cliContainer, path.dirname(folder));
    else
        cliContainer.processor = new Processors.FileSystem(cliContainer, folder);

    Processors.FileSystem.discoverCommands(folder, cliContainer, { processor: cliContainer.processor, isDirectory: folderOrFile.isDirectory() }).then(() =>
    {
        if (require.main == module)
        {
            var args = yargs(process.argv.slice(3))
            cliContainer.dispatch(cliContainer.resolve('$init') || '$serve', { options: args, param: args._ });
        }
    });

    process.on('message', async function (message: string)
    {
        var oMessage = JSON.parse(message);
        try
        {
            var result = await cliContainer.dispatch(oMessage, Object.assign(oMessage.params ?? { param: [] }, { _trigger: 'ipc' }));
            if (process.send)
                process.send(JSON.stringify({ jsonrpc: oMessage.jsonrpc, result: result, id: oMessage.id }));
        }
        catch (e)
        {
            console.error(e);
            if (process.send)
                process.send(JSON.stringify({ jsonrpc: '2.0', id: oMessage.id, error: { message: e.message, stackTrace: e.stack, code: e.code } }))
        }
    })
})(process.argv[2]);