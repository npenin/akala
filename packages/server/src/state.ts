import { HttpRouter } from "./router"
import { Injector } from "@akala/core";

export interface State
{
    mode?: 'production' | 'development';
    assets: Injector;
    masterRouter?: HttpRouter
    preAuthenticatedRouter?: HttpRouter;
    authenticationRouter?: HttpRouter;
    lateBoundRoutes?: HttpRouter;
    app?: HttpRouter;
}