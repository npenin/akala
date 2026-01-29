import { bold, italic, strikethrough, underline } from 'yoctocolors'
import { Middleware, MiddlewareAsync } from '../middlewares/shared.js';
import { each } from '../each.js';

/**
 * Enum representing logging levels mapped to numeric priorities
 * @enum {number}
 * @property {number} error - Highest priority error level (0)
 * @property {number} warn - Warning level (1)
 * @property {number} help - Help information (2)
 * @property {number} info - General information (3)
 * @property {number} prompt - Prompt messages (4)
 * @property {number} debug - Debug-level messages (5)
 * @property {number} data - Data tracing (6)
 * @property {number} verbose - Verbose output (7)
 * @property {number} input - Input tracing (8)
 * @property {number} silly - Lowest priority tracing (9)
 */
export enum LogLevels
{
    error = 0,
    warn = 1,
    help = 2,
    info = 3,
    prompt = 4,
    debug = 5,
    data = 6,
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
}

export interface ILogMiddlewareAsync extends MiddlewareAsync<[LogLevels, string[], ...unknown[]]>
{
}

export type ILogger<TLogger = ILogMiddleware> =
    {
        [key in Exclude<keyof typeof LogLevels, number>]: TLogger
    }

export type ILoggerAsync = ILogger<ILogMiddlewareAsync>

export const logConfig: {
    defaultLevel: LogLevels;
    namespaceConfig: LogConfig
} = { defaultLevel: LogLevels.error, namespaceConfig: {} };

// Configuration change listeners
const configListeners: Set<() => void> = new Set();

/**
 * Subscribe to configuration changes
 * @param listener Callback function to invoke when config changes
 * @returns Unsubscribe function
 */
export function onConfigChange(listener: () => void): () => void
{
    configListeners.add(listener);
    return () => configListeners.delete(listener);
}

/**
 * Notify all listeners that config has changed
 */
function notifyConfigChange(): void
{
    configListeners.forEach(listener => listener());
}

/**
 * Get the effective log level for a given namespace
 * Checks namespace-specific config first, then falls back to default level
 */
export function getEffectiveLogLevel(namespace: string[]): LogLevels
{
    if (namespace.length === 0)
        return logConfig.defaultLevel;

    return resolveNamespaceLevel(logConfig.namespaceConfig, namespace, 0);
}

function tryResolveFromMatch(match: any, namespace: string[], index: number, isLastPart: boolean): LogLevels | undefined
{
    if (match === undefined)
        return undefined;

    const level = match.level;

    // Return level if found and this is the last part
    if (isLastPart && level !== undefined)
        return level;

    // Check if we can descend further
    const hasChildren = Object.keys(match).some(k => k !== 'level');
    if (hasChildren)
        return resolveNamespaceLevel(match, namespace, index + 1);

    // Only has level property, return it
    if (level !== undefined)
        return level;

    return undefined;
}

function resolveNamespaceLevel(config: any, namespace: string[], index: number): LogLevels
{
    // Base case: reached end of namespace
    if (index >= namespace.length)
        return logConfig.defaultLevel;

    const part = namespace[index];
    const isLastPart = index === namespace.length - 1;

    // Try exact match first
    const exactResult = tryResolveFromMatch(config[part], namespace, index, isLastPart);
    if (exactResult !== undefined)
        return exactResult;

    // Try wildcard match
    const wildcardResult = tryResolveFromMatch(config['*'], namespace, index, isLastPart);
    if (wildcardResult !== undefined)
        return wildcardResult;

    return logConfig.defaultLevel;
}

export function configureLogging(config: { defaultLevel?: LogLevels, namespaceConfig?: EasyLogConfig })
{
    let changed = false;
    if (config.defaultLevel !== undefined)
    {
        if (logConfig.defaultLevel !== config.defaultLevel)
            changed = true;
        logConfig.defaultLevel = config.defaultLevel;
    }
    if (config.namespaceConfig !== undefined)
    {
        // If namespaceConfig is empty, clear the existing config
        if (Object.keys(config.namespaceConfig).length === 0)
        {
            logConfig.namespaceConfig = {};
            changed = true;
        }
        else
        {
            deepMerge(logConfig.namespaceConfig, config.namespaceConfig);
            changed = true;
        }
    }
    if (changed)
    {
        notifyConfigChange();
    }
}

function deepMerge(a: LogConfig, b: EasyLogConfig)
{
    each(b, (c, k) =>
    {
        if (a[k] === undefined)
            if (typeof c == 'number')
                a[k] = { level: c };
            else
            {
                a[k] = {};
                deepMerge(a[k] as LogConfig, c);
            }
        else if (typeof c == 'number')
            a[k].level = c;
        else
            deepMerge(a[k] as unknown as LogConfig, c);
    })
}

export type LogConfig = { [key: string]: { level?: LogLevels } & LogConfig };
export type EasyLogConfig = { [key: string]: LogLevels | EasyLogConfig };

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
            .replace(/\*\*((?:[^*]|\*[^*])+)\*\*/g, (_, text) => bold(text))
            .replace(/_([^_]+)_/g, (_, text) => underline(text))
            .replace(/\*([^*]+)\*/g, (_, text) => italic(text))
            .replace(/```.*\n((?:[^`]|\n)+)\n```/g, (_, text) => italic(bold(text)))
            .replace(/`([^`]+)`/g, (_, text) => italic(bold(text)))
            .replace(/~~((?:[^~]|~[^~])+)~~/g, (_, text) => strikethrough(text))
            .replace(/:([a-z_]+):/g, (_, emojiName) => emojiMap[emojiName] || `:${emojiName}:`)
            , ...args);
    else
        oldErrorLog.call(console, format, ...args);
}
