#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem } from "./processors/fs"
import { description } from './commands'
import yargs from 'yargs-parser'

var cliContainer = new Container('cli', {});

export var container: Promise<description.commands> = (async function ()
{
    await FileSystem.discoverCommands(path.resolve(__dirname, './cli'), cliContainer);

    if (require.main == module)
    {
        cliContainer.trap(await FileSystem.asTrap(cliContainer));
        var args = yargs(process.argv.slice(2))
        cliContainer.dispatch(args._[0], { options: args, param: args._.slice(1), _trigger: 'cli' }).then((result: any) =>
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