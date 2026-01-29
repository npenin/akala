/**
 * Centralized logging system with namespace-based routing
 * @packageDocumentation
 */

import { ILogger, ILoggerAsync, LogLevels, onConfigChange, logConfig, LogConfig } from './shared.js';
import { process } from '../middlewares/shared.js';
import { LoggerRoute } from './sync/route.js';
import { LoggerRouteAsync } from './async/route.js';
export * from './shared.js'
export * from './sync/console.js'
export * from './sync/debug.js'
export * from './sync/multicast.js'
export * from './sync/route.js'
export * from './sync/wrapper.js'
export * from './async/web-stream.js'
export * from './async/sync.js'
export * from './async/multicast.js'
export * from './async/route.js'
export * from './async/wrapper.js'

/**
 * Fast logger wrapper with pre-resolved namespace handlers
 * shouldHandle and handle are cached per namespace for maximum performance
 */
export class LoggerWrapper<TLogger extends LoggerRoute | LoggerRouteAsync = LoggerRoute | LoggerRouteAsync>
{
    private readonly namespaces: string[];
    private readonly handlers: Map<LogLevels, () => unknown> = new Map();
    private readonly unsubscribeConfigListener: (() => void) | undefined;
    private maxLevel: LogLevels;

    constructor(private readonly logger: TLogger, namespace?: string)
    {
        this.namespaces = namespace?.split(':') ?? [];
        this.maxLevel = this.calculateEffectiveMaxLevel();
        this._resolveHandlers();
        // Subscribe to config changes to refresh handlers when needed
        this.unsubscribeConfigListener = onConfigChange(() => this._resolveHandlers());
    }

    /**
     * Calculate the effective max level for this logger, considering both the provided maxLevel
     * and any namespace-specific configuration and global default level
     */
    private calculateEffectiveMaxLevel(): LogLevels
    {
        // Check if there's namespace-specific config
        let config = logConfig.namespaceConfig;
        for (const part of this.namespaces)
        {
            const partConfig = config[part];
            if (partConfig === undefined)
            {
                // Try wildcard
                const wildcardConfig = config['*'];
                if (wildcardConfig?.level !== undefined)
                {
                    return wildcardConfig.level;
                }
                break;
            }

            // Found config for this part
            if (typeof partConfig === 'number')
            {
                // Direct level assignment
                return partConfig;
            }

            if (partConfig.level !== undefined)
            {
                // Found explicit level for this namespace - use the more permissive level
                return partConfig.level;
            }

            // Descend into nested config
            config = partConfig as LogConfig;
        }

        // No namespace-specific config found - use the more permissive of maxLevel or global default
        return logConfig.defaultLevel;
    }

    private _resolveHandlers()
    {
        // Clear previous handlers
        this.handlers.clear();

        // Pre-resolve effective max level
        this.maxLevel = this.calculateEffectiveMaxLevel();

        // Pre-resolve all handlers for this namespace/level combination
        const levelEntries = Object.entries(LogLevels).filter(([k, v]) => typeof v === 'number');
        const effectiveMaxLevel = this.maxLevel;

        for (const [levelName, levelValue] of levelEntries)
        {
            const logLevel = levelValue as LogLevels;
            const middleware = this.logger[levelName];

            // Create a pre-resolved handler that captures the middleware and namespace
            const handler = (...values: unknown[]) =>
            {
                // Use pre-resolved effective max level
                if (logLevel > effectiveMaxLevel)
                    return undefined;

                try
                {
                    return process(middleware, logLevel, this.namespaces, ...values);
                }
                catch (e)
                {
                    if (e)
                        throw e;
                    throw new Error('no logger could handle this message. Are you missing to call configureLogging ?', { cause: e });
                }
            };

            this.handlers.set(logLevel, handler);
        }
    }

    /**
     * Clean up config listener when wrapper is destroyed
     */
    public destroy(): void
    {
        if (this.unsubscribeConfigListener)
        {
            this.unsubscribeConfigListener();
        }
    }

    private getHandler(logLevel: LogLevels)
    {
        return this.handlers.get(logLevel) as (...args: unknown[]) => unknown;
    }

    private tryGetHandler(logLevel: LogLevels)
    {
        return (...values: unknown[]) =>
        {
            try
            {
                return process(this.logger[LogLevels[logLevel]], logLevel, this.namespaces, ...values);
            }
            catch (e: unknown)
            {
                // Intentionally ignore errors in try handlers
                // eslint-disable-next-line no-console
                console.error('Error in log handler:', e);
                return undefined;
            }
        };
    }

    public error(...values: unknown[]) { return this.getHandler(LogLevels.error)(...values); }
    public warn(...values: unknown[]) { return this.getHandler(LogLevels.warn)(...values); }
    public help(...values: unknown[]) { return this.getHandler(LogLevels.help)(...values); }
    public data(...values: unknown[]) { return this.getHandler(LogLevels.data)(...values); }
    public info(...values: unknown[]) { return this.getHandler(LogLevels.info)(...values); }
    public debug(...values: unknown[]) { return this.getHandler(LogLevels.debug)(...values); }
    public prompt(...values: unknown[]) { return this.getHandler(LogLevels.prompt)(...values); }
    public verbose(...values: unknown[]) { return this.getHandler(LogLevels.verbose)(...values); }
    public input(...values: unknown[]) { return this.getHandler(LogLevels.input)(...values); }
    public silly(...values: unknown[]) { return this.getHandler(LogLevels.silly)(...values); }

    public tryError(...values: unknown[]) { return this.tryGetHandler(LogLevels.error)(...values); }
    public tryWarn(...values: unknown[]) { return this.tryGetHandler(LogLevels.warn)(...values); }
    public tryHelp(...values: unknown[]) { return this.tryGetHandler(LogLevels.help)(...values); }
    public tryData(...values: unknown[]) { return this.tryGetHandler(LogLevels.data)(...values); }
    public tryInfo(...values: unknown[]) { return this.tryGetHandler(LogLevels.info)(...values); }
    public tryDebug(...values: unknown[]) { return this.tryGetHandler(LogLevels.debug)(...values); }
    public tryPrompt(...values: unknown[]) { return this.tryGetHandler(LogLevels.prompt)(...values); }
    public tryVerbose(...values: unknown[]) { return this.tryGetHandler(LogLevels.verbose)(...values); }
    public tryInput(...values: unknown[]) { return this.tryGetHandler(LogLevels.input)(...values); }
    public trySilly(...values: unknown[]) { return this.tryGetHandler(LogLevels.silly)(...values); }

    public pipe(logger: ILogger | ILoggerAsync)
    {
        return this.logger.pipe(logger as any);
    }

    public use(namespace: string): LoggerWrapper<TLogger>
    {
        namespace.split(':').reduce((previous, current) => previous.use(current), this.logger) as TLogger;
        return new LoggerWrapper(this.logger, namespace);
    }

    public isEnabled(logLevel: LogLevels)
    {
        return logLevel <= this.maxLevel;
    }
}

export const logger = new LoggerWrapper(new LoggerRoute('*'));
export const asyncLogger = new LoggerWrapper(new LoggerRouteAsync('*'));
