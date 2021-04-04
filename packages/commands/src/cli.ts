#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem, DiscoveryOptions } from "./processors/fs"
import commands from './commands'
import yargs from 'yargs-parser'
import { registerCommands } from "./generator";

const cliContainer: commands & Container<void> = new Container<void>('cli', undefined);

export const container: Promise<commands> = (async function ()
{
    const root = path.resolve(__dirname, './cli');
    const options: DiscoveryOptions = { processor: new FileSystem(cliContainer, path.join(__dirname, '../')), relativeTo: path.join(__dirname, '../') };

    const commands = await FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor, cliContainer);

    if (require.main == module)
    {
        // cliContainer.trap(await FileSystem.asTrap(cliContainer));
        const cmd = cliContainer.resolve(process.argv[2]);
        const args = yargs(process.argv.slice(3), cmd?.config?.cli?.options);
        // console.log(args);
        // console.log(cmd?.config?.cli?.options);
        cliContainer.dispatch(cmd, { options: args, param: args._, _trigger: 'cli' }).then((result: unknown) =>
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