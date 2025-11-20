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
        this.error = new LoggerMiddleware((...args) => console.error(...args), LogLevels.error, '*');
        this.warn = new LoggerMiddleware((...args) => console.warn(...args), LogLevels.warn, '*');
        this.help = new LoggerMiddleware((...args) => console.info(...args), LogLevels.help, '*');
        this.data = new LoggerMiddleware((...args) => console.log(...args), LogLevels.data, '*');
        this.info = new LoggerMiddleware((...args) => console.info(...args), LogLevels.info, '*');
        this.debug = new LoggerMiddleware((...args) => console.debug(...args), LogLevels.debug, '*');
        this.prompt = new LoggerMiddleware((...args) => console.log(...args), LogLevels.prompt, '*');
        this.verbose = new LoggerMiddleware((...args) => console.log(...args), LogLevels.verbose, '*');
        this.input = new LoggerMiddleware((...args) => console.log(...args), LogLevels.input, '*');
        this.silly = new LoggerMiddleware((...args) => console.log(...args), LogLevels.silly, '*');
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
