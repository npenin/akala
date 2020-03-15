#!/usr/bin/env node
import { Container } from "./model/container";
import * as path from 'path'
import { FileSystem } from "./processors/fs"
import { description } from './commands'
import yargs from 'yargs-parser'

var cliContainer = new Container('cli', {});

var promise = FileSystem.discoverCommands(path.resolve(__dirname, './cli'), cliContainer).then(() =>
{
    if (require.main == module)
    {
        var args = yargs(process.argv.slice(2))
        cliContainer.dispatch(args._[0], { options: args, param: args._.slice(1), _trigger: 'cli' });
    }
});

export var container: Promise<description.commands> = promise.then(() => cliContainer);