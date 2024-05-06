import { MiddlewareAsync, MiddlewarePromise } from "@akala/core";
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

export class NonPublicMiddleware implements MiddlewareAsync<[Request, ...unknown[]]>, MiddlewareAsync<[Request, Response]>
{
    handle(req: Request): MiddlewarePromise
    {
        if (!req.user)
            return Promise.reject(new AuthorizeError('User is not authenticated'));
        return Promise.resolve();
    }
}