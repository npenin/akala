import '../model/authorization-code';
import '../model/access-token';
import '../model/client';
import '../model/user';

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

export * from './middlewares/authenticate'
export * from './middlewares/authorize'
export * from './middlewares/Authorize401ChallengeFormatter'
export * from './middlewares/AuthorizeRedirectFormatter'
export * from './middlewares/grant'