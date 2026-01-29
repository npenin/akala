import { ILoggerAsync, ILogMiddlewareAsync, LogLevels } from "../shared.js";
import { MiddlewareResult } from "../../middlewares/shared.js";

/**
 * Fast async namespace-aware wrapper for logging with pre-resolved handlers
 * shouldHandle and handle are pre-computed per namespace
 */
class NamespaceLogMiddlewareAsync implements ILogMiddlewareAsync
{
    private handleFunc: (level: LogLevels, namespaces: string[], ...context: unknown[]) => Promise<MiddlewareResult>;

    constructor(
        private logger: ILogMiddlewareAsync,
        private logLevel: LogLevels,
        private readonly namespace: string
    )
    {
        // Pre-resolve handle logic
        this.handleFunc = this._resolveHandle();
    }

    private _resolveHandle(): (level: LogLevels, namespaces: string[], ...context: unknown[]) => Promise<MiddlewareResult>
    {
        return async (level: LogLevels, namespaces: string[], ...context: unknown[]): Promise<MiddlewareResult> =>
        {
            // Check log level
            if (this.logLevel < level)
                throw undefined;

            // Check namespace
            if (this.namespace !== '*' && this.namespace !== namespaces[0])
                throw undefined;

            return this.logger.handle(level, namespaces.slice(1), ...context);
        };
    }

    async handle(level: LogLevels, namespaces: string[], ...context: unknown[]): Promise<MiddlewareResult>
    {
        return this.handleFunc(level, namespaces, ...context);
    }

    public updateHandler(logger: ILogMiddlewareAsync)
    {
        this.logger = logger;
    }

    public updateLevel(level: LogLevels)
    {
        if (this.logLevel !== level)
        {
            this.logLevel = level;
            // Re-resolve on change
            this.handleFunc = this._resolveHandle();
        }
    }
}

/**
 * Async logger wrapper that pre-resolves namespace-specific handlers
 * Faster than dynamic evaluation for each log call
 */
export class LoggerLogMiddlewareWrapperAsync implements ILoggerAsync
{
    error: ILogMiddlewareAsync;
    warn: ILogMiddlewareAsync;
    help: ILogMiddlewareAsync;
    data: ILogMiddlewareAsync;
    info: ILogMiddlewareAsync;
    debug: ILogMiddlewareAsync;
    prompt: ILogMiddlewareAsync;
    verbose: ILogMiddlewareAsync;
    input: ILogMiddlewareAsync;
    silly: ILogMiddlewareAsync;

    constructor(logger: ILogMiddlewareAsync)
    {
        this.error = new NamespaceLogMiddlewareAsync(logger, LogLevels.error, '*');
        this.warn = new NamespaceLogMiddlewareAsync(logger, LogLevels.warn, '*');
        this.help = new NamespaceLogMiddlewareAsync(logger, LogLevels.help, '*');
        this.data = new NamespaceLogMiddlewareAsync(logger, LogLevels.data, '*');
        this.info = new NamespaceLogMiddlewareAsync(logger, LogLevels.info, '*');
        this.debug = new NamespaceLogMiddlewareAsync(logger, LogLevels.debug, '*');
        this.prompt = new NamespaceLogMiddlewareAsync(logger, LogLevels.prompt, '*');
        this.verbose = new NamespaceLogMiddlewareAsync(logger, LogLevels.verbose, '*');
        this.input = new NamespaceLogMiddlewareAsync(logger, LogLevels.input, '*');
        this.silly = new NamespaceLogMiddlewareAsync(logger, LogLevels.silly, '*');
    }
}
