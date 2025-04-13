import { ErrorWithStatus, HttpStatusCode, lazy, SimpleInjector } from '@akala/core';
import oidcDiscover, { OIDCMetadata } from '../client/oidc-discover.js';
import { NonPublicMiddleware } from './middlewares/authorize.js';
import { Request } from '@akala/server';
import { AuthorizeRedirectFormatter } from './middlewares/AuthorizeRedirectFormatter.js';
import { Processors } from '@akala/commands';

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

export function oidcFormatter(name: string, metadata: OIDCMetadata, options: { clientId: string, redirectUri: string })
{
    const injector = new SimpleInjector();
    injector.register('$resolveUrl', (url: string) => new URL(url, metadata.rootUrl).toString());

    return new AuthorizeRedirectFormatter(() =>
    {
        const httpOptions = Processors.HttpClient.buildCall(metadata.authorize, (url: string) => new URL(url, metadata.rootUrl).toString(), options);
        const url = new URL(httpOptions.url);
        if (httpOptions.method.toLowerCase() == 'get')
            return url;
        throw new ErrorWithStatus(HttpStatusCode.BadRequest, `The OIDC provider ${name} does not support the GET method for authorization`);
    }, 'redirect_uri')
}
