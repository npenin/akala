#!/usr/bin/env node
import * as akala from "./";
import { Container } from "./container";
import * as path from 'path'
import * as fs from 'fs';
import { Command } from "./command";
import { FileSystem } from "./processors/fs"

var cliContainer = new Container('cli', {});

FileSystem.discoverCommands(path.resolve(__dirname, './cli'), cliContainer).then(() =>
{
    if (require.main == module)
        cliContainer.dispatch(process.argv[2], ...process.argv.slice(3));
});