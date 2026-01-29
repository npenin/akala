import { ILogMiddleware, ILogger, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';
import { blue, cyan, black, gray, green, magenta, red, white, yellow, reset } from 'yoctocolors'

/**
 * Simple middleware wrapper for handler functions
 */
class SimpleLogMiddleware implements ILogMiddleware
{
    constructor(private readonly handler: (logLevel: LogLevels, namespaces: string[], ...args: unknown[]) => void) { }

    handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): MiddlewareResult
    {
        this.handler(logLevel, namespaces, ...args);
        return undefined;
    }
}

/**
 * Example console-based logger implementation for demonstration
 * @implements ILogger
 */

// @logger.service('console')
export class ConsoleLogger implements ILogger
{
    public static readonly instance = new ConsoleLogger()

    public static readonly colors: Record<LogLevels, (text: string) => string> = {
        [LogLevels.error]: red,
        [LogLevels.warn]: yellow,
        [LogLevels.help]: cyan,
        [LogLevels.data]: magenta,
        [LogLevels.info]: green,
        [LogLevels.debug]: blue,
        [LogLevels.prompt]: white,
        [LogLevels.verbose]: gray,
        [LogLevels.input]: black,
        [LogLevels.silly]: reset
    };

    constructor()
    {
        if (ConsoleLogger.instance)
            return ConsoleLogger.instance;
        this.error = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.error(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.warn = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.warn(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.help = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.info(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.data = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.info = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.info(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.debug = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.debug(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.prompt = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.verbose = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.input = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
        this.silly = new SimpleLogMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${ConsoleLogger.colors[logLevel](LogLevels[logLevel])}:[${ConsoleLogger.colorize(namespace.join(':'))}] ${format}`, ...args));
    }

    private static readonly namespaceColors: Record<string, (text: string) => string> = {};

    static colorize(arg0: string)
    {
        let colorFn = this.namespaceColors[arg0];
        if (!colorFn)
        {
            const colors = Object.values(ConsoleLogger.colors);
            colorFn = colors[Object.keys(this.namespaceColors).length % colors.length];
            this.namespaceColors[arg0] = colorFn;
        }
        return colorFn(arg0);
    }

    public readonly error: ILogMiddleware;
    public readonly warn: ILogMiddleware;
    public readonly help: ILogMiddleware;
    public readonly data: ILogMiddleware;
    public readonly info: ILogMiddleware;
    public readonly debug: ILogMiddleware;
    public readonly prompt: ILogMiddleware;
    public readonly verbose: ILogMiddleware;
    public readonly input: ILogMiddleware;
    public readonly silly: ILogMiddleware;
}
