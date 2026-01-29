import { ILogger, ILogMiddleware, LogLevels } from "../shared.js";
import { MiddlewareResult } from "../../middlewares/shared.js";

/**
 * Fast namespace-aware wrapper for logging with pre-resolved handlers
 * shouldHandle and handle are pre-computed per namespace
 */
class NamespaceLogMiddleware implements ILogMiddleware
{
    private shouldHandleFunc: (logLevel: LogLevels, namespaces: string[]) => boolean;
    private handleFunc: (level: LogLevels, namespaces: string[], ...context: unknown[]) => MiddlewareResult;

    constructor(
        private logger: ILogMiddleware,
        private logLevel: LogLevels,
        private readonly namespace: string
    )
    {
        // Pre-resolve shouldHandle and handle logic
        this.shouldHandleFunc = this._resolveShouldHandle();
        this.handleFunc = this._resolveHandle();
    }

    private _resolveShouldHandle(): (logLevel: LogLevels, namespaces: string[]) => boolean
    {
        if (this.logLevel >= LogLevels.silly)
        {
            // Level allows all
            if (this.namespace === '*')
            {
                return () => true;
            }
            else
            {
                return (logLevel: LogLevels, namespaces: string[]) => 
                    this.namespace === namespaces[0] || namespaces.length === 0;
            }
        }
        else if (this.namespace === '*')
        {
            return (logLevel: LogLevels) => this.logLevel >= logLevel;
        }
        else
        {
            return (logLevel: LogLevels, namespaces: string[]) =>
                this.logLevel >= logLevel && (this.namespace === namespaces[0] || namespaces.length === 0);
        }
    }

    private _resolveHandle(): (level: LogLevels, namespaces: string[], ...context: unknown[]) => MiddlewareResult
    {
        return (level: LogLevels, namespaces: string[], ...context: unknown[]): MiddlewareResult =>
        {
            if (this.shouldHandleFunc(level, namespaces))
            {
                return this.logger.handle(level, namespaces.slice(1), ...context);
            }
            throw undefined;
        };
    }

    handle(level: LogLevels, namespaces: string[], ...context: unknown[]): MiddlewareResult
    {
        return this.handleFunc(level, namespaces, ...context);
    }

    public updateHandler(logger: ILogMiddleware)
    {
        this.logger = logger;
    }

    public updateLevel(level: LogLevels)
    {
        if (this.logLevel !== level)
        {
            this.logLevel = level;
            // Re-resolve on change
            this.shouldHandleFunc = this._resolveShouldHandle();
            this.handleFunc = this._resolveHandle();
        }
    }
}

/**
 * Logger wrapper that pre-resolves namespace-specific handlers
 * Faster than dynamic evaluation for each log call
 */
export class LoggerLogMiddlewareWrapper implements ILogger
{
    error: ILogMiddleware;
    warn: ILogMiddleware;
    help: ILogMiddleware;
    data: ILogMiddleware;
    info: ILogMiddleware;
    debug: ILogMiddleware;
    prompt: ILogMiddleware;
    verbose: ILogMiddleware;
    input: ILogMiddleware;
    silly: ILogMiddleware;

    constructor(logger: ILogMiddleware)
    {
        this.error = new NamespaceLogMiddleware(logger, LogLevels.error, '*');
        this.warn = new NamespaceLogMiddleware(logger, LogLevels.warn, '*');
        this.help = new NamespaceLogMiddleware(logger, LogLevels.help, '*');
        this.data = new NamespaceLogMiddleware(logger, LogLevels.data, '*');
        this.info = new NamespaceLogMiddleware(logger, LogLevels.info, '*');
        this.debug = new NamespaceLogMiddleware(logger, LogLevels.debug, '*');
        this.prompt = new NamespaceLogMiddleware(logger, LogLevels.prompt, '*');
        this.verbose = new NamespaceLogMiddleware(logger, LogLevels.verbose, '*');
        this.input = new NamespaceLogMiddleware(logger, LogLevels.input, '*');
        this.silly = new NamespaceLogMiddleware(logger, LogLevels.silly, '*');
    }
}
