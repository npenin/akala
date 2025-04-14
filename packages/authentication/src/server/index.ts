import { convertToMiddleware, defaultInjector, ErrorWithStatus, Http, HttpStatusCode, isStandardMiddleware, lazy } from '@akala/core';
import oidcDiscover, { OIDCMetadata } from '../client/oidc-discover.js';
import { NonPublicMiddleware } from './middlewares/authorize.js';
import { HttpRouter, Request, Response } from '@akala/server';
import { AuthorizeRedirectFormatter } from './middlewares/AuthorizeRedirectFormatter.js';
import { Processors } from '@akala/commands';
import { OIDCResponseType } from '../client/oidc-state.js';
import { AccessTokenResponse, ErrorResponse } from './middlewares/grant.js';
import { IdSerializer, IdStore } from './authentication-store.js';
import { jwt, JWT, JWTValues } from '@akala/jwt';

export const isAuthorized = new NonPublicMiddleware();

export interface AuthRequest<T> extends Request
{
    // login(user: T, options?: LoginOptions): Promise<unknown>;
    user?: T;
}

export * from './middlewares/authenticate.js'
export * from './middlewares/authorize.js'
export * from './middlewares/Authorize401ChallengeFormatter.js'
export * from './middlewares/AuthorizeRedirectFormatter.js'
export * from './middlewares/grant.js'


export const google = lazy(() => oidcDiscover('https://accounts.google.com'));
export const facebook = lazy(() => oidcDiscover('https://www.facebook.com'));
export const github = lazy(() => oidcDiscover('https://github.com'));
export const microsoft = lazy(() => oidcDiscover('https://login.microsoftonline.com'));
export const linkedin = lazy(() => oidcDiscover('https://www.linkedin.com'));
export function azure(tenantId: string)
{
    return oidcDiscover(`https://login.microsoftonline.com/${tenantId}/v2.0/`);
}

export class OidcFormatter<T extends { clientId: string, redirectUri: string }> extends AuthorizeRedirectFormatter
{
    constructor(public readonly name: string, private readonly metadata: OIDCMetadata, public readonly options: T)
    {
        super((req) =>
        {
            const httpOptions = Processors.HttpClient.buildCall(metadata.authorize, (url: string) => new URL(url, metadata.rootUrl).toString(), null, { ...options, redirectUri: new URL(options.redirectUri, req.uri), responseType: OIDCResponseType.Code });
            console.log(httpOptions);
            const url = new URL(httpOptions.url);
            if (typeof httpOptions.queryString === 'string')
                url.search = httpOptions.queryString;
            else
                httpOptions.queryString.forEach((value, key) => url.searchParams.append(key, value));
            if (httpOptions.method.toLowerCase() == 'get')
                return url;
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, `The OIDC provider ${name} does not support the GET method for authorization`);
        }, 'redirect_uri');
    }

    public async attachTo(router: HttpRouter, priority: number, idStorageFactory: (keys: Promise<Record<string, CryptoKey>>) => IdStore<string>)
    {
        const idStorage = idStorageFactory(Promise.all(Object.entries(this.metadata.keys).map(async e => e[1].alg ? [e[0], await jwt.getCryptoKeyFromWebKey(e[1])] : undefined)).then(e => Object.fromEntries(e.filter(e => e))));
        router.formatters.useMiddleware(priority, this);

        if (isStandardMiddleware(idStorage))
            router.useMiddleware(idStorage as any);

        router.use(this.options.redirectUri, async (req: Request, res: Response) =>
        {
            const result = await this.getToken(req.query.get('code')!, new URL(req.query.get('redirect_uri') || this.options.redirectUri, req.uri))

            if ('access_token' in result)
            {
                await idStorage.saveId(req, res, result.access_token);
            }
            else
                throw new ErrorWithStatus(400, result.error_description, result.error);
            return res.redirect('/');
        });
    }

    public async getToken(code: string, redirectUri: URL): Promise<AccessTokenResponse | ErrorResponse>
    {
        const call = Processors.HttpClient.buildCall(this.metadata['get-token'], (url: string) => new URL(url, this.metadata.rootUrl).toString(), this.options, {
            code,
            grantType: 'authorization_code',
            redirectUri: redirectUri.toString(),
        });
        console.log(call);
        const result = await (await defaultInjector.resolve<Http>('$http').call(call)).json();
        console.log(result);
        if (result.error)
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, result.error_description, result.error);
        return result;
    }

    public static async Google<T extends { clientId: string, redirectUri: string }>(options: T)
    {
        return new OidcFormatter('google', await google(), options);
    }
    public static async Facebook<T extends { clientId: string, redirectUri: string }>(options: T)
    {
        return new OidcFormatter('facebook', await facebook(), options);
    }
    public static async Github<T extends { clientId: string, redirectUri: string }>(options: T)
    {
        return new OidcFormatter('github', await github(), options);
    }
    public static async Microsoft<T extends { clientId: string, redirectUri: string }>(options: T)
    {
        return new OidcFormatter('microsoft', await microsoft(), options);
    }
    public static async Linkedin<T extends { clientId: string, redirectUri: string }>(options: T)
    {
        return new OidcFormatter('linkedin', await linkedin(), options);
    }
    public static async Azure<T extends { clientId: string, redirectUri: string, tenantId: string }>(options: T)
    {
        return new OidcFormatter('azure', await azure(options.tenantId), options);
    }

    public requireAuthorization<T>(req: AuthRequest<T>): Promise<undefined>
    {
        if (!req.user)
            return Promise.reject(new ErrorWithStatus(HttpStatusCode.Unauthorized));
        return Promise.reject(undefined);
    }

    public readonly requireAuthorizationMiddleware = convertToMiddleware(this.requireAuthorization);
}


export class CookieIdStore<T> implements IdStore<T>
{
    constructor(private readonly cookieName: string, private readonly cookieOptions: { [key: string]: unknown } = {}, private readonly serializer: IdSerializer<T>)
    {
    }

    async saveId(req: Request, res: Response, value: T): Promise<void>
    {
        res.setCookie(this.cookieName, await this.serializer.stringify(value), this.cookieOptions);
    }

    async getId(req: Request, res: Response): Promise<T>
    {
        return this.serializer.parse(req.cookies[this.cookieName]);
    }
}

export class StringSerializer implements IdSerializer<string>
{
    stringify(value: string): Promise<string>
    {
        return Promise.resolve(value);
    }
    parse(value: string): Promise<string>
    {
        return Promise.resolve(value);
    }

}

export class JwtSerializer<T extends Record<string, JWTValues>> implements IdSerializer<JWT<T>>
{
    constructor(private readonly keys?: Promise<Record<string, CryptoKey>>)
    {

    }

    async stringify(value: JWT<T>)
    {
        if (value.header.kid)
            return jwt.serialize(value, (await this.keys)[value.header.kid]);
        else if (this.keys)
            return jwt.serialize(value, (await this.keys)['']);
        return jwt.serialize(value);
    }

    parse(value: string)
    {
        return Promise.resolve(jwt.deserialize<T>(value))
    }

}
