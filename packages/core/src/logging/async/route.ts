import { ILoggerAsync, ILogMiddlewareAsync, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';
import { MulticastLogMiddlewareAsync } from './multicast.js';


export class LogRouteMiddlewareAsync<TMiddleware extends ILogMiddlewareAsync> implements ILogMiddlewareAsync
{
    constructor(public readonly pattern: string, protected readonly logger: TMiddleware)
    {
    }

    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean
    {
        return this.pattern === '*' || this.pattern == namespaces[0];

    }

    handle(level: LogLevels, namespaces: string[], ...context: unknown[]): Promise<MiddlewareResult<'break'>>
    {
        if (this.shouldHandle(level, namespaces))
            return this.logger.handle(level, namespaces.slice(1), ...context);
    }
}


export class MulticastLogRouteMiddlewareAsync extends LogRouteMiddlewareAsync<MulticastLogMiddlewareAsync>
{
    constructor(public readonly pattern: string)
    {
        super(pattern, new MulticastLogMiddlewareAsync());
        this.use = this.logger.use.bind(this.logger);
    }

    public readonly use: MulticastLogMiddlewareAsync['use'];
}

export class LoggerRouteAsync implements ILoggerAsync
{
    constructor(private pattern: string)
    {
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
