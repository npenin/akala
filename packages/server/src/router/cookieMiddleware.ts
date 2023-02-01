import { Middleware, MiddlewarePromise } from '@akala/core'
import { Request } from './shared.js'
import cookie from 'cookie'

export class CookieMiddleware implements Middleware<[Request, ...unknown[]]>
{
    constructor(private options: cookie.CookieParseOptions)
    {

    }

    handle(request: Request): MiddlewarePromise
    {
        if (request.headers['cookie'])
        {
            request.cookies = cookie.parse(request.headers.cookie, this.options)
        }
        return Promise.resolve();
    }
}