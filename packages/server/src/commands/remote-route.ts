import { serveStatic, translateRequest } from "../master-meta";
import { State } from "../state";
import * as path from 'path'
import { HttpRouter, CallbackResponse } from "../router";
import { Container } from "@akala/commands";

export default function route(this: State, route: string, target: Container<void>, options: { pre?: boolean, auth?: boolean, app?: boolean, get?: boolean, use?: boolean })
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

    var router: HttpRouter;

    console.log('registering route to ' + target + ' as ' + route);
    if (options.pre)
        router = this.preAuthenticatedRouter;
    else if (options.auth)
        router = this.authenticationRouter;
    else if (options.app)
        router = this.app;
    else
        router = this.lateBoundRoutes;

    router[method](route, async function (req, res, next)
    {
        var result: CallbackResponse = await target.dispatch('$request', translateRequest(req));

    });
}