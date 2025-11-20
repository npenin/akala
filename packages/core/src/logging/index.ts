/**
 * Centralized logging system with namespace-based routing
 * @packageDocumentation
 */

import { LogLevels } from './shared.js';
import { process } from '../middlewares/shared.js';
import { LoggerRoute } from './sync/route.js';
import { LoggerRouteAsync } from './async/route.js';

export class LoggerWrapper<TLogger extends LoggerRoute | LoggerRouteAsync = LoggerRoute | LoggerRouteAsync>
{
    public error(...values: unknown[]) { return process(this.logger.error, this.maxLevel, [], ...values); }
    public warn(...values: unknown[]) { return process(this.logger.warn, this.maxLevel, [], ...values); }
    public help(...values: unknown[]) { return process(this.logger.help, this.maxLevel, [], ...values); }
    public data(...values: unknown[]) { return process(this.logger.data, this.maxLevel, [], ...values); }
    public info(...values: unknown[]) { return process(this.logger.info, this.maxLevel, [], ...values); }
    public debug(...values: unknown[]) { return process(this.logger.debug, this.maxLevel, [], ...values); }
    public prompt(...values: unknown[]) { return process(this.logger.prompt, this.maxLevel, [], ...values); }
    public verbose(...values: unknown[]) { return process(this.logger.verbose, this.maxLevel, [], ...values); }
    public input(...values: unknown[]) { return process(this.logger.input, this.maxLevel, [], ...values); }
    public silly(...values: unknown[]) { return process(this.logger.silly, this.maxLevel, [], ...values); }

    constructor(private logger: TLogger, public maxLevel: LogLevels) { }

    public use(namespace: string, logLevel?: LogLevels): LoggerWrapper<TLogger>
    {
        const route = this.logger.use(namespace) as TLogger;
        return new LoggerWrapper(route, logLevel ?? this.maxLevel);
    }

    public isEnabled(logLevel: LogLevels)
    {
        return logLevel <= this.maxLevel;
    }
}

export const logger = new LoggerWrapper(new LoggerRoute('*'), LogLevels.info);
export const asyncLogger = new LoggerWrapper(new LoggerRouteAsync('*'), LogLevels.info);
