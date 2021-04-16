#!/usr/bin/env node
import 'source-map-support/register'
// import * as debug from 'debug';
import { CliContext } from './router';
// debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
// import './client';
// import './plugins';
// import './helpers/newmodule';
export * from './router'
import program from './router';
export default program;

export function buildCliContext<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(...args: string[]): CliContext<T>
{
    return { args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined }
}
export function buildCliContextFromProcess<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(): CliContext<T>
{
    return { args: process.argv.slice(2), argv: process.argv, commandPath: process.argv0, options: {} as T, currentWorkingDirectory: process.cwd() }
}
