import { ILogger, ILogMiddleware, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';
import { MulticastLogMiddleware } from './multicast.js';


export class LogRouteMiddleware<TMiddleware extends ILogMiddleware> implements ILogMiddleware
{
    constructor(public readonly pattern: string, protected readonly logger: TMiddleware, public readonly logLevel: LogLevels)
    {
    }

    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean
    {
        return (this.pattern === '*' || namespaces.length === 0 || this.pattern == namespaces[0]) && this.logLevel <= logLevel;

    }

    handle(level: LogLevels, namespaces: string[], ...context: unknown[]): MiddlewareResult
    {
        if (this.shouldHandle(level, namespaces))
            return this.logger.handle(level, namespaces.slice(1), ...context);
        throw undefined;
    }
}


export class MulticastLogRouteMiddleware extends LogRouteMiddleware<MulticastLogMiddleware>
{
    constructor(pattern: string, logLevel: LogLevels)
    {
        super(pattern, new MulticastLogMiddleware(), logLevel);
        this.use = this.logger.use.bind(this.logger);
    }

    public readonly use: MulticastLogMiddleware['use'];
}

export class LoggerRoute implements ILogger
{
    constructor(private pattern: string)
    {
        this.error = new MulticastLogRouteMiddleware(this.pattern, LogLevels.error)
        this.warn = new MulticastLogRouteMiddleware(this.pattern, LogLevels.warn)
        this.help = new MulticastLogRouteMiddleware(this.pattern, LogLevels.help)
        this.data = new MulticastLogRouteMiddleware(this.pattern, LogLevels.data)
        this.info = new MulticastLogRouteMiddleware(this.pattern, LogLevels.info)
        this.debug = new MulticastLogRouteMiddleware(this.pattern, LogLevels.debug)
        this.prompt = new MulticastLogRouteMiddleware(this.pattern, LogLevels.prompt)
        this.verbose = new MulticastLogRouteMiddleware(this.pattern, LogLevels.verbose)
        this.input = new MulticastLogRouteMiddleware(this.pattern, LogLevels.input)
        this.silly = new MulticastLogRouteMiddleware(this.pattern, LogLevels.silly)
    }

    public use(namespace: string)
    {
        const sub = new LoggerRoute(namespace);

        this.error.use(sub.error);
        this.warn.use(sub.warn);
        this.help.use(sub.help);
        this.data.use(sub.data);
        this.info.use(sub.info);
        this.debug.use(sub.debug);
        this.prompt.use(sub.prompt);
        this.verbose.use(sub.verbose);
        this.input.use(sub.input);
        this.silly.use(sub.silly);

        return sub;
    }

    public readonly error: MulticastLogRouteMiddleware;
    public readonly warn: MulticastLogRouteMiddleware;
    public readonly help: MulticastLogRouteMiddleware;
    public readonly data: MulticastLogRouteMiddleware;
    public readonly info: MulticastLogRouteMiddleware;
    public readonly debug: MulticastLogRouteMiddleware;
    public readonly prompt: MulticastLogRouteMiddleware;
    public readonly verbose: MulticastLogRouteMiddleware;
    public readonly input: MulticastLogRouteMiddleware;
    public readonly silly: MulticastLogRouteMiddleware;
}
