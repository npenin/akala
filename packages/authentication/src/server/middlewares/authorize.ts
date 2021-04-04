import { Middleware, MiddlewarePromise } from "@akala/core";
import { Request, Response } from "@akala/server";

export const AuthorizeErrorCode = 'ENOTAUTHORIZED';

export class AuthorizeError extends Error
{
    code = AuthorizeErrorCode;

    constructor(message?: string)
    {
        super(message);
    }
}

export class AuthorizeMiddleware implements Middleware<[Request, ...unknown[]]>, Middleware<[Request, Response]>
{
    handle(req: Request): MiddlewarePromise
    {
        if (!req.user)
            return Promise.resolve(new AuthorizeError('User is not authenticated'));
        return Promise.resolve();
    }
}