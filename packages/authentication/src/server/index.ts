import { NonPublicMiddleware } from './middlewares/authorize.js';
import { Request } from '@akala/server';

export const isAuthorized = new NonPublicMiddleware();

interface LoginOptions
{
    session?: boolean;
}

export interface AuthRequest<T> extends Request
{
    login(user: T, options?: LoginOptions): Promise<unknown>;
    user?: T;
}

export * from './middlewares/authenticate.js'
export * from './middlewares/authorize.js'
export * from './middlewares/Authorize401ChallengeFormatter.js'
export * from './middlewares/AuthorizeRedirectFormatter.js'
export * from './middlewares/grant.js'
