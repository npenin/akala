import { HttpRouter } from './router/index.js';
import { Injector } from "@akala/core";
import { Container } from "@akala/commands";

export interface State
{
    pm: Container<void>
    mode?: 'production' | 'development';
    assets: Injector;
    mainRouter?: HttpRouter
    preAuthenticatedRouter?: HttpRouter;
    authenticationRouter?: HttpRouter;
    lateBoundRoutes?: HttpRouter;
    app?: HttpRouter;
}
