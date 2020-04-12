#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem } from "./processors/fs"
import { description } from './commands'
import yargs from 'yargs-parser'
import { registerCommands } from "./generator";

var cliContainer = new Container('cli', {});

export var container: Promise<description.commands> = (async function ()
{
    var root = path.resolve(__dirname, './cli');
    var options = { processor: new FileSystem<any>(cliContainer, root) };

    var commands = await FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor, cliContainer);

    if (require.main == module)
    {
        cliContainer.trap(await FileSystem.asTrap(cliContainer));
        var cmd = cliContainer.resolve(process.argv[2]);
        var args = yargs(process.argv.slice(3), cmd?.config?.cli?.options);
        cliContainer.dispatch(cmd, { options: args, param: args._.slice(1), _trigger: 'cli' }).then((result: any) =>
        {
            if (typeof (result) != 'undefined')
                console.log(result);
        }, (error: Error) =>
        {
            if (args.v)
                console.log(error);
            else
                console.log(error.message);
        });
    }

    return cliContainer;
})()