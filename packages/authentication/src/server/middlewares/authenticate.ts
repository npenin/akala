import { MiddlewareAsync, MiddlewarePromise, NotHandled } from '@akala/core';
import { User } from '../../model/user.js';
import { AuthRequest } from '../index.js';
import { CookieMiddleware, Request, Response } from '@akala/server';
import { IdSerializer, IdStore } from '../authentication-store.js';

export abstract class AuthenticateMiddleware<T> implements MiddlewareAsync<[AuthRequest<T>, ...unknown[]]>
{
    public abstract validate(req: AuthRequest<T>): Promise<T>;

    handle(req: AuthRequest<T>): MiddlewarePromise
    {
        return this.validate(req)?.then((user) => { req.user = user; return NotHandled; }, x => Promise.resolve(x)) || NotHandled;
    }
}

export class HeaderAuthenticateMiddleware<T> extends AuthenticateMiddleware<T>
{
    constructor(private readonly headerName: string, private readonly validateHeader: (value: string | string[]) => Promise<T>)
    {
        super();
    }

    public validate(value): Promise<T>
    {
        return value?.headers?.[this.headerName] && this.validateHeader(value.headers[this.headerName]);
    }
}

export class CookieAuthenticateMiddleware<T> extends AuthenticateMiddleware<T> implements IdStore<T>
{
    private readonly cookieMiddleware = new CookieMiddleware({});

    /**
     * @param cookieName The name of the cookie to look for
     * @param validateHeader The function to call to validate the header
     */
    constructor(private readonly cookieName: string, private readonly serializer: IdSerializer<T>, private readonly cookieOptions: Record<string, unknown>)
    {
        super();
    }

    async saveId(req: Request, res: Response, value: T)
    {
        res.setCookie(this.cookieName, await this.serializer.stringify(value), this.cookieOptions);
    }

    getId(req: Request): Promise<T>
    {
        return req.cookies?.[this.cookieName] && this.serializer.parse(req.cookies?.[this.cookieName]);
    }

    public async validate(req: AuthRequest<T>): Promise<T>
    {
        const cookie = await this.getId(req);
        if (cookie)
            return cookie;
        return Promise.reject();
    }

    public async handle(req: AuthRequest<T>, ...others: unknown[])
    {
        const error = await this.cookieMiddleware.handle(req, others[0] as Response);
        if (error)
            return error;
        return super.handle(req);
    }
}

export class AuthorizationHeaderAuthenticateMiddleware<T> extends HeaderAuthenticateMiddleware<T>
{
    constructor(authenticationScheme: string, authenticationExchange: (value: string) => Promise<T>)
    {
        super('Authorization', header =>
        {
            if (Array.isArray(header))
                header = header[0];
            if (!header.startsWith(authenticationScheme + ' '))
                return Promise.reject();
            return authenticationExchange(header.substring(authenticationScheme.length + 1));
        });
    }
}

export class BearerAuthenticateMiddleware<T = User> extends AuthorizationHeaderAuthenticateMiddleware<T>
{
    constructor(authenticationExchange: (value: string) => Promise<T>)
    {
        super('Bearer', authenticationExchange);
    }
}

export class BasicAuthenticateMiddleware<T = User> extends AuthorizationHeaderAuthenticateMiddleware<T>
{
    constructor(validator: (userName: string, password: string) => Promise<T>, encoding: BufferEncoding = 'utf-8')
    {
        super('Basic', header =>
        {
            const decoded = Buffer.from(header, 'base64').toString(encoding);
            const indexOfColon = decoded.indexOf(':');
            return validator(decoded.substring(0, indexOfColon), decoded.substring(indexOfColon + 1));
        })
    }
}
