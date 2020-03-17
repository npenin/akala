import { HttpRouter } from "./router"

export interface State
{
    masterRouter: HttpRouter
    preAuthenticatedRouter: HttpRouter;
    authenticationRouter: HttpRouter;
    lateBoundRoutes: HttpRouter;
    app: HttpRouter;
}