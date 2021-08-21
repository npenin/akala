import sms from 'source-map-support'
import winston from 'winston';
sms.install();
// import * as debug from 'debug';
import program, { CliContext } from './router/index';
// debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
// import './client';
// import './plugins';
// import './helpers/newmodule';
export * from './router/index'
export default program;
export function buildCliContext<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(...args: string[]): CliContext<T>
{
    return { args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined, logger: winston.createLogger({ levels: winston.config.cli.levels }) }
}
export function buildCliContextFromProcess<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(logger?: winston.Logger): CliContext<T>
{
    return { args: process.argv.slice(2), argv: process.argv, commandPath: process.argv0, options: {} as T, currentWorkingDirectory: process.cwd(), logger: logger || winston.createLogger({ levels: winston.config.cli.levels, format: winston.format.combine(winston.format.splat(), winston.format.colorize(), winston.format.simple()), level: 'error', transports: [new winston.transports.Console()] }) }
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

export class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: number, message?: string)
    {
        super(message);
    }
}
