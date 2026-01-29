import { type ErrorMiddlewareAsync, HttpStatusCode, logger, type MiddlewarePromise, type MiddlewareResult, NotHandled } from "@akala/core";
import type { Request, Response } from "@akala/server";

const log = logger.use('akala:auth:redirect-formatter');


export class AuthorizeRedirectFormatter implements ErrorMiddlewareAsync<[unknown, Response]>
{
    constructor(private readonly redirectUrl: URL | string | ((req: Request) => URL | string), public readonly redirectQueryParameter: string)
    {
    }

    handleError(error: MiddlewareResult, req: Request, response: Response): MiddlewarePromise<never>
    {
        log.debug(error);
        if (error && typeof error == 'object' && 'statusCode' in error && error.statusCode === HttpStatusCode.Unauthorized && !response.headersSent)
        {
            let url = this.redirectUrl;
            if (typeof (url) === 'function')
                url = url(req);
            if (typeof url === 'string')
                url = new URL(url);
            if (this.redirectQueryParameter)
                url.searchParams[this.redirectQueryParameter] = req['returnUrl'] || req.url;
            return Promise.reject(response.redirect(url.toString()));
        }
        return NotHandled;
    }
}
