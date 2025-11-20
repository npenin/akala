import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddlewareAsync, LogLevels } from "../shared.js";

export class MulticastLogMiddlewareAsync implements ILogMiddlewareAsync
{
    constructor(private loggers: ILogMiddlewareAsync[] = []) { }

    public use(...middlewares: ILogMiddlewareAsync[])
    {
        this.loggers.push(...middlewares);
    }

    shouldHandle(logLevel: LogLevels, namespaces: string[])
    {
        return this.loggers.reduce((previous, current) => previous && current.shouldHandle(logLevel, namespaces), true);
    }

    handle(logLevel: LogLevels, namespaces: string[], ...args): Promise<MiddlewareResult>
    {
        return Promise.allSettled(this.loggers.filter(l => l.shouldHandle(logLevel, namespaces)).map(l => l.handle(logLevel, namespaces, ...args))).then((res) =>
        {
            const results = res.filter(x => x);
            const fullfilled: MiddlewareResult[] = results.filter(r => r.status === 'fulfilled').map(r => r.value).filter(r => r);
            const rejected: any[] = results.filter(r => r.status === 'rejected').map(r => r.reason);
            if (results.length === 0 || rejected.length == 0)
                return;
            if (fullfilled.length === 1)
                return (fullfilled[0]);
            if (rejected.length === 1)
                return Promise.reject(rejected[0]);
            if (fullfilled.length > 1)
                return new AggregateError(fullfilled, 'Multiple loggers handled the message');
            if (rejected.length > 1)
                return Promise.reject(rejected);
        });
    }


}

export function multicastLoggerAsync(...loggers: ILogMiddlewareAsync[]): ILogMiddlewareAsync
{
    return new MulticastLogMiddlewareAsync(loggers);
}
