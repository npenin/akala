import { ErrorMiddlewareAsync, ErrorWithStatus, HttpStatusCode, MiddlewarePromise } from "@akala/core";
import { Response } from "@akala/server";

export class AuthorizeRedirectFormatter implements ErrorMiddlewareAsync<[unknown, Response]>
{
    constructor(private readonly redirectUrl: URL | string | (() => URL | string), public readonly redirectQueryParameter: string)
    {
    }

    handleError(error: ErrorWithStatus, req, response: Response): MiddlewarePromise
    {
        if (error && error.statusCode === HttpStatusCode.Unauthorized && !response.headersSent)
        {
            let url = this.redirectUrl;
            if (typeof (url) === 'function')
                url = url();
            if (typeof url === 'string')
                url = new URL(url);
            if (this.redirectQueryParameter)
                url.searchParams[this.redirectQueryParameter] = req['returnUrl'] || req.url;
            return Promise.reject(response.redirect(url.toString()));
        }
        return Promise.resolve();
    }
}
