import { MiddlewareAsync, MiddlewarePromise } from '@akala/core';
import { User } from '../../model/user.js';
import { AuthRequest } from '../index.js';

export abstract class AuthenticateMiddleware<T> implements MiddlewareAsync<[AuthRequest<T>, ...unknown[]]>
{
    public abstract validate(req: AuthRequest<T>): Promise<T>;

    handle(req: AuthRequest<T>): MiddlewarePromise
    {
        return this.validate(req).then((user) => { req.user = user; return Promise.resolve(); }, x => Promise.resolve(x));
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
