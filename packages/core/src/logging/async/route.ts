import { ILoggerAsync, ILogMiddlewareAsync, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';

/**
 * Fast multicast middleware for async routing log messages to multiple handlers
 */
export class MulticastLogMiddlewareAsync implements ILogMiddlewareAsync
{
    constructor(private readonly loggers: ILogMiddlewareAsync[] = []) { }

    public use(...middlewares: ILogMiddlewareAsync[])
    {
        this.loggers.push(...middlewares);
    }

    async handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): Promise<MiddlewareResult>
    {
        const results = await Promise.allSettled(
            this.loggers.map(l => l.handle(logLevel, namespaces, ...args))
        );

        const fulfilled = results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<MiddlewareResult>).value)
            .filter(Boolean);

        const rejected = results
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason);

        if (results.length === 0 || rejected.length === 0)
            throw undefined;
        if (fulfilled.length === 1)
            return fulfilled[0];
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
export class MulticastLogRouteMiddlewareAsync implements ILogMiddlewareAsync
{
    private readonly multicast: MulticastLogMiddlewareAsync;

    constructor(public readonly pattern: string)
    {
        this.multicast = new MulticastLogMiddlewareAsync();
    }

    async handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): Promise<MiddlewareResult>
    {
        // Pattern matching: '*' matches everything, otherwise match first namespace
        if (this.pattern !== '*' && namespaces.length > 0 && this.pattern !== namespaces[0])
            throw undefined;

        return this.multicast.handle(logLevel, namespaces.slice(1), ...args);
    }

    public use(...middlewares: ILogMiddlewareAsync[])
    {
        this.multicast.use(...middlewares);
    }
}

/**
 * Simplified async namespace-based router for logging
 * Pre-resolves shouldHandle and handle per namespace
 */
export class LoggerRouteAsync implements ILoggerAsync
{
    constructor(private readonly pattern: string = '*')
    {
        // Create multicasters for each log level with pattern-based routing
        this.error = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.warn = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.help = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.data = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.info = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.debug = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.prompt = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.verbose = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.input = new MulticastLogRouteMiddlewareAsync(this.pattern);
        this.silly = new MulticastLogRouteMiddlewareAsync(this.pattern);
    }

    public use(namespace: string)
    {
        const sub = new LoggerRouteAsync(namespace);
        this.pipe(sub);
        return sub;
    }

    public pipe(logger: ILoggerAsync)
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

    public readonly error: MulticastLogRouteMiddlewareAsync;
    public readonly warn: MulticastLogRouteMiddlewareAsync;
    public readonly help: MulticastLogRouteMiddlewareAsync;
    public readonly data: MulticastLogRouteMiddlewareAsync;
    public readonly info: MulticastLogRouteMiddlewareAsync;
    public readonly debug: MulticastLogRouteMiddlewareAsync;
    public readonly prompt: MulticastLogRouteMiddlewareAsync;
    public readonly verbose: MulticastLogRouteMiddlewareAsync;
    public readonly input: MulticastLogRouteMiddlewareAsync;
    public readonly silly: MulticastLogRouteMiddlewareAsync;
}

