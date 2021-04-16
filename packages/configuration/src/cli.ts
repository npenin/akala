#!/usr/bin/env node
import { Container, Processor, Processors, registerCommands } from '@akala/commands';
import * as path from 'path'
import commander from './commander';

const cliContainer = new Container('cli', {});

export var container: Promise<commander> = (async function ()
{
    const root = path.resolve(__dirname, './commands');
    const options: Processors.DiscoveryOptions = { processor: new Processors.FileSystem<any>(cliContainer, path.join(__dirname, '../')), relativeTo: path.join(__dirname, '../') };

    const commands = await Processors.FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor as Processor, cliContainer);

    if (require.main == module)
    {
        // cliContainer.trap(await FileSystem.asTrap(cliContainer));
        const cmd = cliContainer.resolve(process.argv[2]);
        const args = yargs(process.argv.slice(3), cmd?.config?.cli?.options);
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