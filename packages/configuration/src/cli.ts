#!/usr/bin/env node
import { Container, Processor, Processors, registerCommands } from '@akala/commands';
import * as path from 'path'
import yargs from 'yargs-parser'
import { description } from './commander';

var cliContainer = new Container('cli', {});

export var container: Promise<description.commands> = (async function ()
{
    var root = path.resolve(__dirname, './commands');
    var options: Processors.DiscoveryOptions<any> = { processor: new Processors.FileSystem<any>(cliContainer, path.join(__dirname, '../')), relativeTo: path.join(__dirname, '../') };

    var commands = await Processors.FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor as Processor<any>, cliContainer);

    if (require.main == module)
    {
        // cliContainer.trap(await FileSystem.asTrap(cliContainer));
        var cmd = cliContainer.resolve(process.argv[2]);
        var args = yargs(process.argv.slice(3), cmd?.config?.cli?.options);
        // console.log(args);
        // console.log(cmd?.config?.cli?.options);
        cliContainer.dispatch(cmd, { options: args, param: args._, _trigger: 'cli' }).then((result: any) =>
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