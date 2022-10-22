import { LogLevels, Logger, logger as LoggerBuilder, grep, map, each } from '@akala/core';
import program, { CliContext, OptionOptions } from './router/index';
export * from './router/index'
export default program;

export function buildCliContext<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(logger: Logger, ...args: string[]): CliContext<T>
{
    const result: CliContext<T> = { args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined } as unknown as CliContext<T>;
    Object.defineProperty(result, 'logger', { enumerable: false, value: logger });
    return result;
}
export function buildCliContextFromProcess<T extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>(logger?: Logger): CliContext<T>
{
    if (process.env.NODE_ENV == 'production')
        logger = logger || LoggerBuilder(process.argv0, LogLevels.error);
    else
        logger = logger || LoggerBuilder(process.argv0, LogLevels.warn);
    const result: CliContext<T> = {
        args: process.argv.slice(2),
        argv: process.argv,
        commandPath: process.argv0,
        options: {} as T,
        currentWorkingDirectory: process.cwd(),
    } as unknown as CliContext<T>;
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
export function unparseWithMeta(options: { [key: string]: OptionOptions }, context: CliContext): string[]
{
    var positionals = map(grep(options, o => o.positional), (o, name) => ({ name, ...o }), true).sort((a, b) => a.position - b.position);
    var args = positionals.map(o => context.options[o.name]).filter(f => typeof f !== 'undefined') as string[];

    each(grep(options, o => !o.positional), (option, name) =>
    {
        if (typeof (name) !== 'string')
            return;
        var optionValue = context.options[name] as string;
        if (typeof (optionValue !== 'undefined'))
            args.unshift("--" + name, optionValue);
    });

    return args.flat();
}

export class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: number, message?: string)
    {
        super(message);
    }
}
