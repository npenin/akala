// import sms from 'source-map-support'
import winston from 'winston';
// sms.install();
// import * as debug from 'debug';
import program, { CliContext } from './router/index';
// debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
// import './client';
// import './plugins';
// import './helpers/newmodule';
export * from './router/index'
export default program;
export function buildCliContext<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(logger: winston.Logger, ...args: string[]): CliContext<T>
{
    const result: CliContext<T> = { args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined } as any;
    Object.defineProperty(result, 'logger', { enumerable: false, value: logger });
    return result;
}
export function buildCliContextFromProcess<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(logger?: winston.Logger): CliContext<T>
{
    logger = logger || winston.createLogger({
        levels: winston.config.cli.levels,
        format: winston.format.combine(
            winston.format.splat(),
            winston.format.colorize(),
            winston.format.simple()),
        level: 'error',
        transports: [new winston.transports.Console()]
    });
    const result: CliContext<T> = {
        args: process.argv.slice(2),
        argv: process.argv,
        commandPath: process.argv0,
        options: {} as T,
        currentWorkingDirectory: process.cwd(),
    } as any;
    Object.defineProperty(result, 'logger', { enumerable: false, value: logger });
    return result;
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
