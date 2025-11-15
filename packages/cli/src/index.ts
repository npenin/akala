import { LogLevels, type Logger, logger as LoggerBuilder, grep, map, each, ObservableObject, defaultContext, setDefaultContext } from '@akala/core';
import program, { type CliContext, NamespaceMiddleware, type OptionOptions, type OptionType, usageParser } from './router/index.js';

export * from './router/index.js'
export default program;
export { program };

export class InteractError extends Error
{
    public readonly code = 'INTERACT';

    constructor(message: string, public as?: string)
    {
        super(message);
    }

    public toJSON(): Record<string, unknown>
    {
        return { code: this.code, message: this.message, as: this.as };
    }
}

export function supportInteract(cli: NamespaceMiddleware)
{
    return async (err: InteractError, context: CliContext) =>
    {

        if (err.code === 'INTERACT')
        {
            console.log(err.message);
            const value = await readLine();
            if (typeof err.as == 'string')
            {
                const indexOfDot = err.as.indexOf('.');
                if (indexOfDot > 0)
                {
                    ObservableObject.setValue(context.options, err.as, value);
                }
                context.options[err.as] = value;
            }
            else
                context.argv.push(value);
            return await cli.process(Object.assign(buildCliContextFromContext(context, ...context.argv.slice(2)), { options: context.options }));
        }
        throw err;
    }
}

let stdinBuffer = '';
export function readLine()
{
    process.stdin.pause();
    return new Promise<string>((resolve) =>
    {
        process.stdin.on('data', function processChunk(chunk)
        {
            stdinBuffer += chunk;
            const indexOfNewLine = chunk.indexOf('\n', stdinBuffer.length - chunk.length);
            if (indexOfNewLine > -1)
            {
                process.stdin.pause();
                process.stdin.removeListener('data', processChunk);
                if (indexOfNewLine < stdinBuffer.length - 1)
                {
                    resolve(stdinBuffer.substring(0, indexOfNewLine));
                    stdinBuffer = stdinBuffer.substring(indexOfNewLine + 1);
                }
                else
                {
                    resolve(stdinBuffer.substring(0, stdinBuffer.length - 1));
                    stdinBuffer = '';
                }
            }
        })
        process.stdin.resume();
    })
}



export function buildCliContext<T extends Record<string, OptionType> = Record<string, OptionType> & { help: boolean }>(logger: Logger, ...args: string[]): CliContext<T, unknown>
{
    const result: Omit<CliContext<T>, 'logger'> = { abort: new AbortController(), args: args, argv: args, options: {} as T, currentWorkingDirectory: undefined };
    Object.defineProperty(result, 'logger', { enumerable: false, value: logger });
    return result as CliContext<T>;
}
export function buildCliContextFromContext<T extends Record<string, OptionType> = Record<string, OptionType> & { help: boolean }, TState = unknown>(context: CliContext<T, TState>, ...args: string[]): CliContext<T, TState>
{
    const result: Omit<CliContext<T, TState>, 'logger'> = { abort: context.abort, args: args, argv: context.argv, options: {} as T, currentWorkingDirectory: context.currentWorkingDirectory, state: context.state };
    Object.defineProperty(result, 'logger', { enumerable: false, value: context.logger });
    return result as CliContext<T, TState>;
}
export function buildCliContextFromProcess<T extends Record<string, OptionType> = Record<string, OptionType> & { help: boolean }, TState = unknown>(logger?: Logger, state?: TState): CliContext<T, TState>
{
    if (process.env.NODE_ENV == 'production')
        logger = logger || LoggerBuilder(process.argv0, LogLevels.error);
    else
        logger = logger || LoggerBuilder(process.argv0, LogLevels.warn);
    const result: Omit<CliContext<T, TState>, 'logger'> = {
        args: process.argv.slice(2),
        argv: process.argv,
        commandPath: process.argv0,
        options: {} as T,
        state,
        abort: new AbortController(),
        currentWorkingDirectory: process.cwd(),
    };
    Object.defineProperty(result, 'logger', { enumerable: false, value: logger });
    if (!defaultContext)
        setDefaultContext(result as CliContext<T, TState>);
    return result as CliContext<T, TState>;
}

export function unparseOptions(options: CliContext['options'], settings: { ignoreUndefined: boolean } = { ignoreUndefined: true }): string[]
{
    return Object.entries(options).flatMap(entry =>
    {
        if (settings.ignoreUndefined && typeof entry[1] === 'undefined')
            return [];
        if (Array.isArray(entry[1]))
            return entry[1].map(v => '--' + entry[0] + '=' + v?.toString());
        return ['--' + entry[0] + '=' + entry[1]?.toString()];
    });
}

export function unparse(context: CliContext): string[]
{
    return [...context.args, ...unparseOptions(context.options)];
}

export function unparseWithMeta(definition: { usage?: string, options?: { [key: string]: OptionOptions<OptionType> } }, context: CliContext): string[]
{
    const positionals = map(grep(definition.options, o => o.positional), (o, name) => ({ name, ...o }), true).sort((a, b) => a.position - b.position);
    const args = positionals.map(o => context.options[o.name]).filter(f => typeof f !== 'undefined') as string[];

    each(grep(definition.options, o => !o.positional), (option, name) =>
    {
        if (typeof (name) !== 'string')
            return;
        const optionValue = context.options[name] as string;
        if (typeof (optionValue) !== 'undefined')
            if (typeof optionValue == 'boolean' && optionValue)
                args.unshift("--" + name);
            else
                args.unshift("--" + name, optionValue);
    });

    if (definition.usage)
        args.unshift(usageParser.exec(definition.usage)[1]);

    return args.flat();
}

export { xpm } from './xpm.js'
