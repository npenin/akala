import { serveStatic } from "../master-meta";
import { State } from "../state";
import { SendOptions } from "send";
import * as path from 'path'

export default function route(this: State, route: string, target: string, options: { pre?: boolean, auth?: boolean, app?: boolean, get?: boolean, use?: boolean } & SendOptions, cwd: string)
{
    var method: 'get' | 'use' | 'useGet';

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


    if (!path.isAbsolute(target))
        target = path.resolve(cwd, target);

    if (options.root && !path.isAbsolute(options.root))
        options.root = path.resolve(cwd, options.root);

    console.log('registering route to ' + target + ' as ' + route);
    if (options.pre)
        this.preAuthenticatedRouter[method](route, serveStatic(target, options))
    else if (options.auth)
        this.authenticationRouter[method](route, serveStatic(target, options));
    else if (options.app)
        this.app[method](route, serveStatic(target, options));
    else
        this.lateBoundRoutes[method](route, serveStatic(target, options));
}