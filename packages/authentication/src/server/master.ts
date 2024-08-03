import '../model/authorization-code.js';
import '../model/access-token.js';
import '../model/client.js';
import '../model/user.js';

// const hash = akala.defaultInjector.injectWithNameAsync(['$config.@akala-modules/authentication.secret'], function (secret: string)
// {
//     return function hash(s: string)
//     {
//         const hash = crypto.createHmac('sha256', secret || 'pwet');
//         hash.update(s);
//         return hash.digest('hex');
//     }
// });

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