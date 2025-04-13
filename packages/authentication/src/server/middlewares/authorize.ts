import { ErrorWithStatus, HttpStatusCode, MiddlewareAsync, MiddlewarePromise } from "@akala/core";
import { AuthRequest } from "../index.js";

export class NonPublicMiddleware implements MiddlewareAsync<[AuthRequest<unknown>, ...unknown[]]>, MiddlewareAsync<[AuthRequest<unknown>, ...unknown[]]>
{
    handle(req: AuthRequest<unknown>): MiddlewarePromise
    {
        if (!req.user)
            return Promise.reject(new ErrorWithStatus(HttpStatusCode.Unauthorized, 'User is not authenticated'));
        return Promise.resolve();
    }
}
