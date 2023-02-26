import { HttpRouter } from './router/index.js';
import { Injector } from "@akala/core";
import * as webpack from "webpack";
import { Container } from "@akala/commands";

export interface State
{
    pm: Container<void>
    mode?: 'production' | 'development';
    assets: Injector;
    masterRouter?: HttpRouter
    preAuthenticatedRouter?: HttpRouter;
    authenticationRouter?: HttpRouter;
    lateBoundRoutes?: HttpRouter;
    app?: HttpRouter;
    webpack: { config: webpack.Configuration, html: unknown }
}