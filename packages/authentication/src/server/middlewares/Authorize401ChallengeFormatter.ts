import { ErrorMiddlewareAsync, ErrorWithStatus, HttpStatusCode, MiddlewarePromise } from "@akala/core";
import { Request, Response } from "@akala/server";


export class Authorize401ChallengeFormatter implements ErrorMiddlewareAsync<[Request, Response]>
{
    constructor(private readonly authenticateChallenges: string[])
    {
    }

    handleError(error: ErrorWithStatus, _req, res: Response): MiddlewarePromise
    {
        if (error && error.statusCode === HttpStatusCode.Unauthorized)
        {
            res.writeHead(401, "Unauthorized", { 'www-authenticate': this.authenticateChallenges });
            res.end();
            return Promise.reject(res);
        }
        return Promise.resolve();
    }
}
