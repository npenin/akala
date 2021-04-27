import * as akala from '@akala/core'
import * as web from '@akala/server'
import * as oauth2orize from 'oauth2orize'
import { AuthorizationCode } from '../model/authorization-code.js';
import { expressions } from '@akala/storage';
import { AuthenticationStore } from './authentication-store.js'
import * as uuid from 'uuid'
import { Client } from '../model/client.js';
import { User } from '../model/user.js';
import { AccessToken } from '../model/access-token.js';
import * as passport from 'passport'
import { ensureLoggedIn } from 'connect-ensure-login'
import { promises as fs } from 'fs';



import * as crypto from 'crypto'
import * as bodyParser from 'co-body';
import '../model/authorization-code';
import '../model/access-token';
import '../model/client';
import '../model/user';
import { Middleware, MiddlewareComposite, MiddlewarePromise, MiddlewareRoute, Routable } from '@akala/core';
import { BasicAuthenticateMiddleware } from './middlewares/authenticate.js';

const hash = akala.defaultInjector.injectWithNameAsync(['$config.@akala-modules/authentication.secret'], function (secret)
{
    return function hash(s: string)
    {
        const hash = crypto.createHmac('sha256', secret || 'pwet');
        hash.update(s);
        return hash.digest('hex');
    }
});

interface LoginOptions
{
    session?: boolean;
}

declare module '@akala/server'
{
    interface Request
    {
        login<T>(user: T, options?: LoginOptions): Promise<unknown>;
        user?: { password?: string, id?: string };
    }
}

export * from './middlewares/authenticate.js'
export * from './middlewares/authorize.js'
export * from './middlewares/Authorize401ChallengeFormatter.js'
export * from './middlewares/AuthorizeRedirectFormatter.js'
export * from './middlewares/grant.js'