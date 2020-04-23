import { HttpRouter } from "./router"
import { Injector } from "@akala/core";
import * as webpack from "webpack";

export interface State
{
    mode?: 'production' | 'development';
    assets: Injector;
    masterRouter?: HttpRouter
    preAuthenticatedRouter?: HttpRouter;
    authenticationRouter?: HttpRouter;
    lateBoundRoutes?: HttpRouter;
    app?: HttpRouter;
    webpack: { config: webpack.Configuration, html: any }
}