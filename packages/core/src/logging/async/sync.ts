import { MiddlewareResult } from "../../middlewares/shared.js";
import { ILogMiddleware, ILogMiddlewareAsync, LogLevels } from "../shared.js";

export class SyncLoggerAsync implements ILogMiddlewareAsync
{
    constructor(private readonly logger: ILogMiddleware)
    {
    }

    async handle(level: LogLevels, namespaces: string[], ...context: unknown[]): Promise<MiddlewareResult>
    {
        return this.logger.handle(level, namespaces, ...context);
    }
}
