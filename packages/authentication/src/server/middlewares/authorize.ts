import { ErrorWithStatus, HttpStatusCode, type MiddlewareAsync, type MiddlewarePromise, NotHandled } from "@akala/core";
import { type AuthRequest } from "../index.js";

export class NonPublicMiddleware implements MiddlewareAsync<[AuthRequest<unknown>, ...unknown[]]>, MiddlewareAsync<[AuthRequest<unknown>, ...unknown[]]>
{
    handle(req: AuthRequest<unknown>): MiddlewarePromise
    {
        if (!req.user)
            return Promise.reject(new ErrorWithStatus(HttpStatusCode.Unauthorized, 'User is not authenticated'));
        return NotHandled;
    }
}
