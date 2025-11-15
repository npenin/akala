import debug from 'debug';
import { bold, italic, strikethrough, underline } from 'yoctocolors'

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

/**
 * Interface defining logger methods for each log level
 * @typedef {Object} ILogger
 * @property {debug.IDebugger} error - Error level logger
 * @property {debug.IDebugger} warn - Warning level logger
 * @property {debug.IDebugger} help - Help level logger
 * @property {debug.IDebugger} data - Data level logger
 * @property {debug.IDebugger} info - Info level logger
 * @property {debug.IDebugger} debug - Debug level logger
 * @property {debug.IDebugger} prompt - Prompt level logger
 * @property {debug.IDebugger} verbose - Verbose level logger
 * @property {debug.IDebugger} input - Input level logger
 * @property {debug.IDebugger} silly - Silly level logger
 */
export type ILogger =
    {
        [key in keyof typeof LogLevels]: debug.IDebugger
    }

/** @internal */
const namespaces: string[] = [];

/**
 * Internal function to configure debug namespaces
 * @param rootNamespace - Base namespace for logging
 * @param logLevel - Maximum level to enable
 */
function setLevel(rootNamespace: string, logLevel: LogLevels)
{
    Object.keys(LogLevels).forEach(key =>
    {
        if (!isNaN(Number(key)))
            return;
        if (LogLevels[key] <= logLevel && !debug.enabled(key + ':' + rootNamespace))
        {
            namespaces.push(key + ':' + rootNamespace);
            debug.enable(namespaces.join(','));
        }
    });
}

/**
 * Logger interface combining log methods with level control
 * @interface Logger
 * @extends ILogger
 * @property {function} level - Get/set current log level
 */
/**
 * Logger interface combining log methods with level control
 * @interface Logger
 * @extends ILogger
 * @property {function} level - Get/set current log level as a LogLevels enum value
 * @property {function} (rootNamespace: string, logLevel: LogLevels) - Call signature to create child logger
 */
export interface Logger extends ILogger
{
    (rootNamespace: string, logLevel?: LogLevels): ILogger
    level: LogLevels
}

/**
 * Creates a namespaced logger with level control
 * @function createLogger
 * @param {string} rootNamespace - Base namespace for the logger (e.g. 'app:module')
 * @param {LogLevels} [logLevel] - Optional initial log level to configure
 * @returns {Logger} Configured logger instance with level control and namespaced methods
 * @example
 * const log = createLogger('my-app', LogLevels.debug);
 * log.info('System initialized');
 * log.level = LogLevels.verbose;
 */
export function logger(rootNamespace: string, logLevel?: LogLevels): Logger
{
    if (typeof logLevel !== 'undefined')
        setLevel(rootNamespace, logLevel);

    const logger = { get level() { return logLevel }, set level(l) { setLevel(rootNamespace, l) } };
    if (debug.enabled(rootNamespace))
        logger.level = LogLevels.silly;
    const debugInstance = debug(rootNamespace);
    Object.keys(LogLevels).forEach(k =>
    {
        if (!isNaN(Number(k)))
            return;
        if (typeof k == 'string')
            Object.defineProperty(logger, k, { value: debugInstance.extend(k), enumerable: false });
    })
    return logger as Logger;
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
