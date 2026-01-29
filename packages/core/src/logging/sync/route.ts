import { ILogger, ILogMiddleware, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';

/**
 * Fast multicast middleware for routing log messages to multiple handlers
 */
export class MulticastLogMiddleware implements ILogMiddleware
{
    constructor(private readonly loggers: ILogMiddleware[] = []) { }

    public use(...middlewares: ILogMiddleware[])
    {
        this.loggers.push(...middlewares);
    }

    handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): MiddlewareResult
    {
        const results = this.loggers.map(l =>
        {
            try
            {
                return { status: 'fulfilled' as const, value: l.handle(logLevel, namespaces, ...args) };
            }
            catch (e)
            {
                return { status: 'rejected' as const, reason: e }
            }
        }).filter(Boolean);
        const fulfilled: MiddlewareResult[] = results.filter(r => r.status === 'fulfilled').map(r => r.value).filter(Boolean);
        const rejected: any[] = results.filter(r => r.status === 'rejected').map(r => r.reason);
        if (results.length === 0 || rejected.length == 0)
            throw undefined;
        if (fulfilled.length === 1)
            return (fulfilled[0]);
        if (rejected.length === 1)
            throw rejected[0];
        if (fulfilled.length > 1)
            return new AggregateError(fulfilled, 'Multiple loggers handled the message');
        if (rejected.length > 1)
            throw rejected;
    }
}

/**
 * Pattern-based routing middleware that wraps a multicast
 */
export class MulticastLogRouteMiddleware implements ILogMiddleware
{
    private readonly multicast: MulticastLogMiddleware;

    constructor(public readonly pattern: string)
    {
        this.multicast = new MulticastLogMiddleware();
    }

    handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): MiddlewareResult
    {
        // Pattern matching: '*' matches everything, otherwise match first namespace
        if (this.pattern !== '*' && namespaces.length > 0 && this.pattern !== namespaces[0])
            throw undefined;

        return this.multicast.handle(logLevel, namespaces.slice(1), ...args);
    }

    public use(...middlewares: ILogMiddleware[])
    {
        this.multicast.use(...middlewares);
    }
}

/**
 * Simplified namespace-based router for logging
 * Pre-resolves shouldHandle and handle per namespace
 */
export class LoggerRoute implements ILogger
{
    constructor(private readonly pattern: string = '*')
    {
        // Create multicasters for each log level with pattern-based routing
        this.error = new MulticastLogRouteMiddleware(this.pattern);
        this.warn = new MulticastLogRouteMiddleware(this.pattern);
        this.help = new MulticastLogRouteMiddleware(this.pattern);
        this.data = new MulticastLogRouteMiddleware(this.pattern);
        this.info = new MulticastLogRouteMiddleware(this.pattern);
        this.debug = new MulticastLogRouteMiddleware(this.pattern);
        this.prompt = new MulticastLogRouteMiddleware(this.pattern);
        this.verbose = new MulticastLogRouteMiddleware(this.pattern);
        this.input = new MulticastLogRouteMiddleware(this.pattern);
        this.silly = new MulticastLogRouteMiddleware(this.pattern);
    }

    public use(namespace: string)
    {
        const sub = new LoggerRoute(namespace);
        this.pipe(sub);
        return sub;
    }

    public pipe(logger: ILogger)
    {
        this.error.use(logger.error);
        this.warn.use(logger.warn);
        this.help.use(logger.help);
        this.data.use(logger.data);
        this.info.use(logger.info);
        this.debug.use(logger.debug);
        this.prompt.use(logger.prompt);
        this.verbose.use(logger.verbose);
        this.input.use(logger.input);
        this.silly.use(logger.silly);
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

