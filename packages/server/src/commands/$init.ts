import { serve, Container } from "@akala/commands";
import { HttpRouter, router } from "../router";
import '../triggers/http'
import { State } from "../state";
import { Injector } from "@akala/core";

export default async function $init(container: Container<State>, options: any)
{
    serve(container, options);
    container.state.assets = new Injector();
    container.state.mode = process.env.NODE_ENV as any;
    container.injectWithName(['$masterRouter'], function (masterRouter: HttpRouter)
    {
        if (typeof (masterRouter) != 'undefined')
        {
            var lateBoundRoutes = router();
            var preAuthenticatedRouter = router();
            var authenticationRouter = router();
            var app = router();
            container.register('$preAuthenticationRouter', preAuthenticatedRouter);
            container.register('$authenticationRouter', authenticationRouter);
            container.register('$router', lateBoundRoutes);
            var masterRouter = router();
            masterRouter.use(preAuthenticatedRouter.router);
            masterRouter.use(authenticationRouter.router);
            masterRouter.use(lateBoundRoutes.router);
            masterRouter.use(app.router);

            container.state.masterRouter = masterRouter
            container.state.preAuthenticatedRouter = preAuthenticatedRouter;
            container.state.authenticationRouter = authenticationRouter;
            container.state.lateBoundRoutes = lateBoundRoutes;
            container.state.app = app;
        }
    })();
}