import { ErrorMiddleware, Middleware, MiddlewareComposite, MiddlewarePromise } from '@akala/core';
import { Request, Response } from '@akala/server'
import { Client } from '../../model/client.js';
import { AuthenticateMiddleware, BasicAuthenticateMiddleware } from './authenticate.js';

export const EINVREQ = 'invalid_request';
export const EINVCLI = 'invalid_client';
export const EINVGRANT = 'invalid_grant';
export const EINVSCOPE = 'invalid_scope';
export const ENOCLIENT = 'unauthorized_client';
export const ENOGRANT = 'unsupported_grant_type';

type OAuthErrorCodes = typeof EINVREQ | typeof EINVCLI | typeof EINVGRANT | typeof EINVSCOPE | typeof ENOCLIENT | typeof ENOGRANT;

export class OAuthError extends Error
{
    code = ENOGRANT;

    constructor(code: OAuthErrorCodes, message?: string)
    {
        super(message || code);
    }
}

export interface QueryExchangeResponse<T>
{
    query: T
}

export interface FragmentExchangeResponse<T>
{
    fragment: T
}
export interface FormPostExchangeResponse<T>
{
    body: T
}

export interface AccessTokenResponse
{
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope: string[];
}

export interface CodeResponse
{

}

export class OAuthErrorFormatter implements ErrorMiddleware<[unknown, Response]>
{
    handleError(error: Error & { code?: string; }, _req, response: Response): MiddlewarePromise
    {
        if (error && error.code)
        {
            switch (error.code)
            {
                case EINVCLI:
                    return Promise.reject(response.status(401).json({ error: error.code, error_description: error.message }));
                case EINVREQ:
                case EINVGRANT:
                case EINVSCOPE:
                case ENOCLIENT:
                case ENOGRANT:
                    return Promise.reject(response.status(400).json({ error: error.code, error_description: error.message }));
                default:
                    return Promise.resolve(error);
            }
        }
    }
}

export class ExchangeMiddleware implements Middleware<[Request, Response]>
{
    basicAuthenticator: AuthenticateMiddleware<Client>;

    constructor(private clientValidator: (clientId: string, clientSecret: string) => Promise<Client>)
    {
        this.basicAuthenticator = new BasicAuthenticateMiddleware(clientValidator);
    }

    static grants: { [key: string]: MiddlewareComposite<[string, string, Request]> };
    public static register(grantType: string, codeValidator: (code: string, clientId: string, req: Request) => Promise<void>, tokenBuilder: (code: string, clientId: string, req: Request) => Promise<AccessTokenResponse>): void
    {
        this.grants[grantType] = this.grants[grantType] || new MiddlewareComposite<[string, string, Request]>(grantType);
        this.grants[grantType].useMiddleware({
            handle: (code, clientId, req) =>
            {
                return codeValidator(code, clientId, req).then(() =>
                    tokenBuilder(code, clientId, req).then(
                        token => Promise.reject(token),
                        (err) => Promise.resolve(err)
                    ),
                    (err) => Promise.resolve(err));
            }
        });
    }

    async handle(req: Request): MiddlewarePromise
    {
        const grantType = req.query.get('grant_type');
        if (!ExchangeMiddleware.grants[grantType])
            return new OAuthError(ENOGRANT);
        return this.basicAuthenticator.validate(req).catch((err) =>
        {
            if (err)
                throw new OAuthError(EINVCLI);
            const clientId = req.query.get('client_id');
            const clientSecret = req.query.get('client_secret');
            return this.clientValidator(clientId, clientSecret);
        }).then(client =>
        {
            const code = req.query.get('code');
            return ExchangeMiddleware.grants[grantType].handle(code, client.id, req);
        }, (err) =>
        {
            if (err && !err.code)
                return Promise.resolve(new OAuthError(EINVCLI));
            return Promise.resolve(err)
        });
    }
}