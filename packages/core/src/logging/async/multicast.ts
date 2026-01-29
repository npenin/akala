// This file is deprecated - use route.ts instead
export { MulticastLogMiddlewareAsync, MulticastLogRouteMiddlewareAsync } from './route.js';

import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddlewareAsync, LogLevels } from "../shared.js";

export function multicastLoggerAsync(...loggers: ILogMiddlewareAsync[]): ILogMiddlewareAsync
{
    return {
        async handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): Promise<MiddlewareResult>
        {
            const results = await Promise.allSettled(loggers.map(l => l.handle(logLevel, namespaces, ...args)));
            const fulfilled: MiddlewareResult[] = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<MiddlewareResult>).value).filter(Boolean);
            const rejected: any[] = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);
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
    };
}
