import { bold, italic, strikethrough, underline } from 'yoctocolors'
import { Middleware, MiddlewareAsync, MiddlewareResult } from '../middlewares/shared.js';
import { each } from '../each.js';

/**
 * Enum representing logging levels mapped to numeric priorities
 * @enum {number}
 * @property {number} error - Highest priority error level (0)
 * @property {number} warn - Warning level (1)
 * @property {number} help - Help information (2)
 * @property {number} data - Data tracing (3)
 * @property {number} info - General information (4)
 * @property {number} debug - Debug-level messages (5)
 * @property {number} prompt - Prompt messages (6)
 * @property {number} verbose - Verbose output (7)
 * @property {number} input - Input tracing (8)
 * @property {number} silly - Lowest priority tracing (9)
 */
export enum LogLevels
{
    error = 0,
    warn = 1,
    help = 2,
    data = 3,
    info = 4,
    debug = 5,
    prompt = 6,
    verbose = 7,
    input = 8,
    silly = 9
}

export interface LogContext 
{
    level: LogLevels;
    namespaces: string[];
    message: string;
    values: unknown[];
}

export interface ILogMiddleware extends Middleware<[LogLevels, string[], ...unknown[]]>
{
    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean;
}

export interface ILogMiddlewareAsync extends MiddlewareAsync<[LogLevels, string[], ...unknown[]]>
{
    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean;
}

export type ILogger<TLogger = ILogMiddleware> =
    {
        [key in Exclude<keyof typeof LogLevels, number>]: TLogger
    }

export type ILoggerAsync = ILogger<ILogMiddlewareAsync>

export class LoggerAdapterMiddleware<
    TLogger extends ILogger | ILoggerAsync
>
{
    constructor(private readonly logger: TLogger) { }

    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): TLogger extends ILoggerAsync
        ? Promise<MiddlewareResult>
        : MiddlewareResult
    {

        return this.logger[LogLevels[logLevel]].handle(logLevel, namespaces, ...context);
    }
}

export const logConfig: {
    defaultLevel: LogLevels;
    namespaceConfig: LogConfig
} = { defaultLevel: LogLevels.error, namespaceConfig: {} };

export function configureLogging(config: { defaultLevel?: LogLevels, namespaceConfig?: EasyLogConfig })
{
    if (typeof config.defaultLevel !== 'undefined')
        logConfig.defaultLevel = config.defaultLevel;
    if (typeof config.namespaceConfig != 'undefined')
    {
        deepMerge(logConfig.namespaceConfig, config.namespaceConfig);
    }
}

function deepMerge(a: LogConfig, b: EasyLogConfig)
{
    each(b, (c, k) =>
    {
        if (typeof a[k] == 'undefined')
            if (typeof c == 'number')
                a[k] = { level: c };
            else
                deepMerge(a[k] = {}, c);
        else if (typeof c == 'number')
            a[k].level = c;
        else
            deepMerge(a[k] as unknown as LogConfig, c);
    })
}

type LogConfig = { [key: string]: { level?: LogLevels } & LogConfig };
export type EasyLogConfig = { [key: string]: LogLevels | EasyLogConfig };

export class LoggerMiddleware<
    TLogger extends ILogMiddleware | ILogMiddlewareAsync
>
{
    constructor(private readonly logger: TLogger['handle'] | ((...args: Parameters<TLogger['handle']>) => void), public readonly logLevel: LogLevels, public readonly namespace: string)
    { }

    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult>
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): TLogger extends ILogMiddlewareAsync
        ? Promise<MiddlewareResult>
        : MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult> | MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult> | MiddlewareResult
    {
        if (this.shouldHandle(logLevel, namespaces))
            return this.logger(logLevel, namespaces, ...context) as TLogger extends ILogMiddlewareAsync
                ? Promise<MiddlewareResult>
                : MiddlewareResult;
        return;
    }

    shouldHandle(
        logLevel: LogLevels,
        namespaces: string[]
    ): boolean
    {
        if (this.logLevel < logLevel)
            return false;
        if (this.namespace !== '*' && this.namespace !== namespaces[0])
            return false
        return true;
    }
}

export class LogMiddlewareWrapper<
    TLogger extends ILogMiddleware | ILogMiddlewareAsync
>
{
    constructor(private readonly logger: TLogger, public readonly logLevel: LogLevels, public readonly namespace: string)
    { }

    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult>
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): TLogger extends ILogMiddlewareAsync
        ? Promise<MiddlewareResult>
        : MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult> | MiddlewareResult
    handle(
        logLevel: LogLevels,
        namespaces: string[],
        ...context: unknown[]
    ): Promise<MiddlewareResult> | MiddlewareResult
    {
        if (this.shouldHandle(logLevel, namespaces))
            return this.logger.handle(logLevel, namespaces, ...context) as TLogger extends ILogMiddlewareAsync
                ? Promise<MiddlewareResult>
                : MiddlewareResult;
        return;
    }

    shouldHandle(
        logLevel: LogLevels,
        namespaces: string[]
    ): boolean
    {
        if (this.logLevel < logLevel)
            return false;
        if (this.namespace !== '*' && this.namespace != namespaces[0])
            return false
        return this.logger.shouldHandle(logLevel, namespaces.slice(1));
    }
}

export const emojiMap = {
    smile: '😄',
    thumbsup: '👍',
    heart: '❤️',
    fire: '🔥',
    star: '⭐',
    cry: '😢',
    laugh: '😂',
    wink: '😉',
    clap: '👏',
    angry: '😠',
    shocked: '😲',
    cool: '😎',
    poop: '💩',
    party: '🥳',
    thinking: '🤔',
    pray: '🙏',
    hug: '🤗',
    ok: '👌',
    eyes: '👀',
    grin: '😁',
    sleepy: '😴',
    kiss: '😘',
    celebration: '🎉',
    check: '✅',
    cross: '❌',
    question: '❓',
    wave: '👋',
    rocket: '🚀',
    100: '💯'
};

const oldErrorLog = console.error;
console.error = function (format, ...args)
{
    if (typeof format == 'string')
        oldErrorLog.call(console, format
            .replace(/__((?:[^_]|_[^_])+)__/g, (_, text) => bold(text))
            .replace(/\*\*((?:[^\*]|\*[^\*])+)\*\*/g, (_, text) => bold(text))
            .replace(/_([^_]+)_/g, (_, text) => underline(text))
            .replace(/\*([^\*]+)\*/g, (_, text) => italic(text))
            .replace(/```.*\n((?:[^`]|\n)+)\n```/g, (_, text) => italic(bold(text)))
            .replace(/`([^`]+)`/g, (_, text) => italic(bold(text)))
            .replace(/~~((?:[^~]|~[^~])+)~~/g, (_, text) => strikethrough(text))
            .replace(/:([a-z_]+):/g, (_, emojiName) => emojiMap[emojiName] || `:${emojiName}:`)
            , ...args);
    else
        oldErrorLog.call(console, format, ...args);
}
