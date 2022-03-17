
import debug from 'debug';
import * as beam from 'triple-beam';

const customOutputs = ['error', 'warn', 'verbose', 'debug', 'info']


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
};

export type ILogger =
    {
        [key in keyof typeof LogLevels]: debug.IDebugger
    }

function setLevel(rootNamespace: string, logLevel: LogLevels)
{
    Object.keys(beam.configs.cli.levels).forEach(key =>
    {
        if (beam.configs.cli.levels[key] <= logLevel && !debug.enabled(key + ':' + rootNamespace))
            debug.enable(key + ':' + rootNamespace);
    });
}

export interface Logger extends ILogger
{
    (rootNamespace: string, logLevel: LogLevels): ILogger
    level: LogLevels
}

export function logger(rootNamespace: string, logLevel: LogLevels): Logger
{
    setLevel(rootNamespace, logLevel);
    const logger = { level: logLevel };
    Object.keys(LogLevels).forEach(k =>
    {
        if (typeof k == 'string')
            logger[k] = debug(k + ':' + rootNamespace);
    })
    return logger as Logger;
}
