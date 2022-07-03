import { ErrorMiddleware, MiddlewarePromise } from "@akala/core";
import { Response } from "@akala/server";
import { AuthorizeErrorCode } from './authorize';


export class AuthorizeRedirectFormatter implements ErrorMiddleware<[unknown, Response]>
{
    redirectUrl: URL;
    redirectQueryParameter: string;
    constructor(redirectUrl: URL | string)
    {
        if (typeof (redirectUrl) == 'string')
            this.redirectUrl = new URL(redirectUrl);

        else
            this.redirectUrl = redirectUrl;
    }

    handleError(error: Error & { code?: string; }, req, response: Response): MiddlewarePromise
    {
        if (error && error.code === AuthorizeErrorCode && !response.headersSent)
        {
            const url = new URL(this.redirectUrl.toString());
            url.searchParams[this.redirectQueryParameter] = req.url;
            return Promise.reject(response.redirect(url.toString()));
        }
        return Promise.resolve();
    }
}
