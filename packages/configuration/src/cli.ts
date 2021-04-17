#!/usr/bin/env node
import { Container, Processor, Processors, registerCommands } from '@akala/commands';
import { processTrigger } from '@akala/commands/dist/triggers/cli';
import * as path from 'path'
import program, { buildCliContextFromProcess } from '@akala/cli';
import commander from './commander';

const cliContainer = new Container('cli', {});

export var container: Promise<commander> = (async function ()
{
    const root = path.resolve(__dirname, './commands');
    const options: Processors.DiscoveryOptions = { processor: new Processors.FileSystem<any>(cliContainer, path.join(__dirname, '../')), relativeTo: path.join(__dirname, '../') };

    const commands = await Processors.FileSystem.discoverMetaCommands(root, options);
    registerCommands(commands, options.processor as Processor, cliContainer);
    cliContainer.attach(processTrigger, program);

    if (require.main == module)
        program.handle(buildCliContextFromProcess()).then(e => { if (e) throw e }, res => res);

    return cliContainer;
})()