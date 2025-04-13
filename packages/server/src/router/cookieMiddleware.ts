import { MiddlewareAsync, MiddlewarePromise } from '@akala/core'
import { Request, Response } from './shared.js'
import cookie from 'cookie'

export class CookieMiddleware implements MiddlewareAsync<[Request, Response, ...unknown[]]>
{
    constructor(private readonly options: cookie.ParseOptions)
    {

    }

    handle(request: Request, response: Response): MiddlewarePromise
    {
        if (request.headers['cookie'])
        {
            request.cookies = cookie.parse(request.headers.cookie, this.options)
            Object.entries(request.cookies).forEach(c => response.appendHeader('set-cookie', cookie.serialize(c[0], c[1])))
        }
        return Promise.resolve();
    }
}
