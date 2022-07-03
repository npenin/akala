
import debug from 'debug';

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

export type ILogger =
    {
        [key in keyof typeof LogLevels]: debug.IDebugger
    }

const namespaces: string[] = [];
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

export interface Logger extends ILogger
{
    (rootNamespace: string, logLevel: LogLevels): ILogger
    level: LogLevels
}

export function logger(rootNamespace: string, logLevel?: LogLevels): Logger
{
    if (typeof logLevel !== 'undefined')
        setLevel(rootNamespace, logLevel);
    const logger = { get level() { return logLevel }, set level(l) { setLevel(rootNamespace, l) } };
    Object.keys(LogLevels).forEach(k =>
    {
        if (!isNaN(Number(k)))
            return;
        if (typeof k == 'string')
            Object.defineProperty(logger, k, { value: debug(k + ':' + rootNamespace), enumerable: false });
    })
    return logger as Logger;
}
