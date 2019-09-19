#!/usr/bin/env node
import { Container } from "./container";
import * as path from 'path'
import { FileSystem } from "./processors/fs"
import { description } from './commands'


var cliContainer = new Container('cli', {});

var promise = FileSystem.discoverCommands(path.resolve(__dirname, './cli'), cliContainer).then(() =>
{
    if (require.main == module)
        cliContainer.dispatch(process.argv[2], ...process.argv.slice(3));
});

export var container: Promise<description.commands> = promise.then(() => cliContainer);