import { Container } from "@akala/commands";
import { HttpRouter } from "../router";
import { serveStatic } from "../master-meta";
import * as yargs from 'yargs-parser'
import { State } from "../state";
import { SendOptions } from "send";

export default async function route(this: State, route: string, target: string, options: { pre?: boolean, auth?: boolean, app?: boolean, get?: boolean, use?: boolean } & SendOptions)
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

    if (options.pre)
        this.preAuthenticatedRouter[method](route, serveStatic(target, options))
    else if (options.auth)
        this.authenticationRouter[method](route, serveStatic(target, options));
    else if (options.app)
        this.app[method](route, serveStatic(target, options));
    else
        this.lateBoundRoutes[method](route, serveStatic(target, options));
}