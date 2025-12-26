import { ILogMiddleware, ILogger, LoggerMiddleware, LogLevels } from '../shared.js';

/**
 * Example console-based logger implementation for demonstration
 * @implements ILogger
 */

// @logger.service('console')
export class ConsoleLogger implements ILogger
{
    public static readonly instance = new ConsoleLogger()

    private currentLevel: LogLevels = LogLevels.info;

    constructor()
    {
        if (ConsoleLogger.instance)
            return ConsoleLogger.instance;
        this.error = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.error(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.error, '*');
        this.warn = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.warn(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.warn, '*');
        this.help = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.info(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.help, '*');
        this.data = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.data, '*');
        this.info = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.info(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.info, '*');
        this.debug = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.debug(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.debug, '*');
        this.prompt = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.prompt, '*');
        this.verbose = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.verbose, '*');
        this.input = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.input, '*');
        this.silly = new LoggerMiddleware((logLevel: LogLevels, namespace: string[], format: any, ...args: unknown[]) => console.log(`${LogLevels[logLevel]}:[${namespace.join(':')}] ${format}`, ...args), LogLevels.silly, '*');
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


    isEnabled(level: LogLevels): boolean
    {
        return level >= this.currentLevel;
    }

    setLevel(level: LogLevels): void
    {
        this.currentLevel = level;
    }

    getLevel(): LogLevels
    {
        return this.currentLevel;
    }
}
