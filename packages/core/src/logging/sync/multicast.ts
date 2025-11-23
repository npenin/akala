import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddleware, LogLevels } from "../shared.js";

export class MulticastLogMiddleware implements ILogMiddleware
{
    constructor(private loggers: ILogMiddleware[] = []) { }

    public use(...middlewares: ILogMiddleware[])
    {
        this.loggers.push(...middlewares);
    }

    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean
    {
        return this.loggers.reduce((previous, current) => previous && current.shouldHandle(logLevel, namespaces), true);
    }

    handle(logLevel: LogLevels, namespaces: string[], ...args): MiddlewareResult
    {
        const results = this.loggers.filter(l => l.shouldHandle(logLevel, namespaces)).map(l =>
        {
            try
            {
                return { status: 'fulfilled' as const, value: l.handle(logLevel, namespaces, ...args) };
            }
            catch (e)
            {
                return { status: 'rejected' as const, reason: e }
            }
        }).filter(x => x);
        const fullfilled: MiddlewareResult[] = results.filter(r => r.status === 'fulfilled').map(r => r.value).filter(r => r);
        const rejected: any[] = results.filter(r => r.status === 'rejected').map(r => r.reason);
        if (results.length === 0 || rejected.length == 0)
            throw undefined;
        if (fullfilled.length === 1)
            return (fullfilled[0]);
        if (rejected.length === 1)
            throw rejected[0];
        if (fullfilled.length > 1)
            return new AggregateError(fullfilled, 'Multiple loggers handled the message');
        if (rejected.length > 1)
            throw rejected;
    }
}

export function multicastLogger(...loggers: ILogMiddleware[]): ILogMiddleware
{
    return new MulticastLogMiddleware(loggers);
}
