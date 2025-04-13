import { ErrorMiddlewareAsync, ErrorWithStatus, HttpStatusCode, MiddlewarePromise } from "@akala/core";
import { Response } from "@akala/server";

export class AuthorizeRedirectFormatter implements ErrorMiddlewareAsync<[unknown, Response]>
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

    handleError(error: ErrorWithStatus, req, response: Response): MiddlewarePromise
    {
        if (error && error.statusCode === HttpStatusCode.Unauthorized && !response.headersSent)
        {
            const url = new URL(this.redirectUrl.toString());
            url.searchParams[this.redirectQueryParameter] = req.url;
            return Promise.reject(response.redirect(url.toString()));
        }
        return Promise.resolve();
    }
}
