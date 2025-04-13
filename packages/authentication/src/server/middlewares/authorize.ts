import { ErrorWithStatus, HttpStatusCode, MiddlewareAsync, MiddlewarePromise } from "@akala/core";
import { Request, Response } from "@akala/server";

export class NonPublicMiddleware implements MiddlewareAsync<[Request, ...unknown[]]>, MiddlewareAsync<[Request, Response]>
{
    handle(req: Request): MiddlewarePromise
    {
        if (!req.user)
            return Promise.reject(new ErrorWithStatus(HttpStatusCode.Unauthorized, 'User is not authenticated'));
        return Promise.resolve();
    }
}
