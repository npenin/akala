import { type State } from '../state.js';
import * as path from 'path'
import { HttpRouter } from '../router/index.js';
import { type Options, StaticFileMiddleware } from '../router/staticFileMiddleware.js';

export default function route(this: State, route: string, target: string | URL, options: { pre?: boolean, auth?: boolean, app?: boolean, get?: boolean, use?: boolean } & Options, cwd: string): void
{
    let method: 'get' | 'use' | 'useGet';

    if (!options)
        options = {};

    if (options.get)
        if (options.use)
            method = 'useGet';
        else
            method = 'get'
    else if (options.use)
        method = 'use';
    else
        method = 'get';

    if (target && (target instanceof URL || URL.canParse(target)))
    {
        target = new URL(target);
    }
    else if (target && !path.isAbsolute(target as string))
        target = path.resolve(cwd, target as string);

    let router: HttpRouter;

    console.log('registering route to ' + target + ' as ' + route);
    if (options.pre)
        router = this.preAuthenticatedRouter;
    else if (options.auth)
        router = this.authenticationRouter;
    else if (options.app)
        router = this.app;
    else
        router = this.lateBoundRoutes;

    router[method + 'Middleware'](route, new StaticFileMiddleware(target, options));
}
