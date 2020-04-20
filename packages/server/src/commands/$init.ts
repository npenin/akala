import { serve, Container } from "@akala/commands";
import { HttpRouter, router } from "../router";
import '../triggers/http'
import { State } from "../state";
import { Injector, Binding } from "@akala/core";

export default async function $init(container: Container<State>, options: any)
{
    await serve(container, options);
    container.state.assets = new Injector();
    var init = true;
    Binding.defineProperty(container.state, 'mode', process.env.NODE_ENV).onChanged(function (ev)
    {
        if (!init)
            container.dispatch('webpack', undefined, true);
    })
    init = false;

    container.injectWithName(['$masterRouter'], function (masterRouter: HttpRouter)
    {
        if (masterRouter)
        {
            var lateBoundRoutes = router();
            var preAuthenticatedRouter = router();
            var authenticationRouter = router();
            var app = router();
            container.register('$preAuthenticationRouter', preAuthenticatedRouter);
            container.register('$authenticationRouter', authenticationRouter);
            container.register('$router', lateBoundRoutes);
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
        else
            console.error('there is no router; Working in degraded mode');
    })();
}