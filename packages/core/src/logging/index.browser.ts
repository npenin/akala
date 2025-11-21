/**
 * Centralized logging system with namespace-based routing
 * @packageDocumentation
 */

import { LogLevels } from './shared.js';
import { process } from '../middlewares/shared.js';
import { LoggerRoute, MulticastLogRouteMiddleware } from './sync/route.js';
import { LoggerRouteAsync, MulticastLogRouteMiddlewareAsync } from './async/route.js';
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

export class LoggerWrapper<TLogger extends LoggerRoute | LoggerRouteAsync = LoggerRoute | LoggerRouteAsync>
{

    private process(log: MulticastLogRouteMiddleware | MulticastLogRouteMiddlewareAsync, ...values: unknown[])
    {
        try
        {
            return process(log, this.maxLevel, this.namespaces, ...values);
        }
        catch (e)
        {
            if (e)
                throw e;
            throw new Error('no logger could handle this message. Are you missing to call configureLogging ?', { cause: e });
        }
    }

    private tryProcess(log: MulticastLogRouteMiddleware | MulticastLogRouteMiddlewareAsync, ...values: unknown[])
    {
        try
        {
            return process(log, this.maxLevel, this.namespaces, ...values);
        }
        catch (e)
        {
            if (e)
                throw e;
        }
    }
    public error(...values: unknown[]) { return this.process(this.logger.error, ...values); }
    public warn(...values: unknown[]) { return this.process(this.logger.warn, ...values); }
    public help(...values: unknown[]) { return this.process(this.logger.help, ...values); }
    public data(...values: unknown[]) { return this.process(this.logger.data, ...values); }
    public info(...values: unknown[]) { return this.process(this.logger.info, ...values); }
    public debug(...values: unknown[]) { return this.process(this.logger.debug, ...values); }
    public prompt(...values: unknown[]) { return this.process(this.logger.prompt, ...values); }
    public verbose(...values: unknown[]) { return this.process(this.logger.verbose, ...values); }
    public input(...values: unknown[]) { return this.process(this.logger.input, ...values); }
    public silly(...values: unknown[]) { return this.process(this.logger.silly, ...values); }
    public tryError(...values: unknown[]) { return this.tryProcess(this.logger.error, ...values); }
    public tryWarn(...values: unknown[]) { return this.tryProcess(this.logger.warn, ...values); }
    public tryHelp(...values: unknown[]) { return this.tryProcess(this.logger.help, ...values); }
    public tryData(...values: unknown[]) { return this.tryProcess(this.logger.data, ...values); }
    public tryInfo(...values: unknown[]) { return this.tryProcess(this.logger.info, ...values); }
    public tryDebug(...values: unknown[]) { return this.tryProcess(this.logger.debug, ...values); }
    public tryPrompt(...values: unknown[]) { return this.tryProcess(this.logger.prompt, ...values); }
    public tryVerbose(...values: unknown[]) { return this.tryProcess(this.logger.verbose, ...values); }
    public tryInput(...values: unknown[]) { return this.tryProcess(this.logger.input, ...values); }
    public trySilly(...values: unknown[]) { return this.tryProcess(this.logger.silly, ...values); }

    constructor(private logger: TLogger, public maxLevel: LogLevels, namespace?: string)
    {
        this.namespaces = namespace?.split(':') ?? [];
    }

    private namespaces: string[];

    public use(namespace: string, logLevel?: LogLevels): LoggerWrapper<TLogger>
    {
        const route = namespace.split(':').reduce((previous, current) => previous.use(current), this.logger) as TLogger;
        // const route = this.logger.use(namespace) as TLogger;
        return new LoggerWrapper(route, logLevel ?? this.maxLevel);
    }

    public isEnabled(logLevel: LogLevels)
    {
        return logLevel <= this.maxLevel;
    }
}

export const logger = new LoggerWrapper(new LoggerRoute('*'), LogLevels.info);
export const asyncLogger = new LoggerWrapper(new LoggerRouteAsync('*'), LogLevels.info);
