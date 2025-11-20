import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddleware, ILogMiddlewareAsync, LogLevels } from "../shared.js";

export class SyncLoggerAsync implements ILogMiddlewareAsync
{
    constructor(private readonly logger: ILogMiddleware)
    {
    }

    shouldHandle(logLevel: LogLevels, namespaces: string[]): boolean
    {
        return this.logger.shouldHandle(logLevel, namespaces);
    }

    handle(level: LogLevels, namespaces: string[], ...context: unknown[]): Promise<MiddlewareResult<'break'>>
    {
        try
        {
            return Promise.resolve(this.logger.handle(level, namespaces.slice(1), ...context));
        }
        catch (e)
        {
            return Promise.reject(e);
        }
    }
}
