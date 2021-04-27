#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
// import * as debug from 'debug';
import program, { CliContext } from './router/index.js';
// debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
// import './client';
// import './plugins';
// import './helpers/newmodule';
export * from './router/index.js'
export default program;
export function buildCliContext<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(...args: string[]): CliContext<T>
{
    return { args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined }
}
export function buildCliContextFromProcess<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(): CliContext<T>
{
    return { args: process.argv.slice(2), argv: process.argv, commandPath: process.argv0, options: {} as T, currentWorkingDirectory: process.cwd() }
}

export function unparseOptions(options: CliContext['options']): string[]
{
    return Object.entries(options).flatMap((key, value) =>
    {
        if (Array.isArray(value))
            return ['--' + key, ...value];
        return ['--' + key, value];
    });
}

export function unparse(context: CliContext): string[]
{
    return [...context.args, ...unparseOptions(context.options)];
}