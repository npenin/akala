// This file is deprecated - use route.ts instead
export { MulticastLogMiddleware, MulticastLogRouteMiddleware } from './route.js';

import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddleware, LogLevels } from "../shared.js";

export function multicastLogger(...loggers: ILogMiddleware[]): ILogMiddleware
{
    return {
        handle(logLevel: LogLevels, namespaces: string[], ...args: unknown[]): MiddlewareResult
        {
            const results = loggers.map(l =>
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
    };
}
