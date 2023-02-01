import { ErrorMiddleware, MiddlewarePromise } from "@akala/core";
import { Request, Response } from "@akala/server";
import { AuthorizeErrorCode } from './authorize.js';


export class Authorize401ChallengeFormatter implements ErrorMiddleware<[Request, Response]>
{
    constructor(private authenticateChallenges: string[])
    {
    }

    handleError(error: Error & { code?: string; }, _req, res: Response): MiddlewarePromise
    {
        if (error && error.code === AuthorizeErrorCode)
        {
            res.writeHead(401, "Unauthorized", { 'www-authenticate': this.authenticateChallenges });
            res.end();
            return Promise.reject(res);
        }
        return Promise.resolve();
    }
}
