import { Container } from "@akala/commands";
import { router, HttpRouter } from '../router/index.js';
import '../triggers/http.js'
import { type State } from '../state.js';
import { logger, SimpleInjector } from "@akala/core";
import { StaticFileMiddleware } from '../router/staticFileMiddleware.js';

const log = logger.use('akala:server')

export default async function $init(container: Container<State>, options: Record<string, unknown>, pm: Container<void>): Promise<void>
{
    container.state.pm = pm;
    // pm.register('$metadata', new CommandProxy(pm.processor, '$metadata'));

    container.state.assets = new SimpleInjector();
    // let init = true;
    // Binding.defineProperty(container.state, 'mode', options.mode || process.env.NODE_ENV).onChanged(function ()
    // {
    //     // if (!init)
    //     //     container.dispatch('webpack', undefined, true);
    // });

    // let indexHtmlPath: string;
    // if (typeof process.versions['pnp'] != 'undefined')
    //     indexHtmlPath = require.resolve('../../views/index.html');
    // else
    //     indexHtmlPath = resolve(__dirname, '../../views/index.html');

    // init = false;

    container.onResolve('$mainRouter', function (mainRouter: HttpRouter)
    {
        log.info('router registered, initializing web server...');
        const lateBoundRoutes = router();
        const preAuthenticatedRouter = router();
        const authenticationRouter = router();
        const app = router();
        container.register('$preAuthenticationRouter', preAuthenticatedRouter);
        container.register('$authenticationRouter', authenticationRouter);
        container.register('$router', lateBoundRoutes);
        mainRouter.useMiddleware(preAuthenticatedRouter);
        mainRouter.useMiddleware(authenticationRouter);
        mainRouter.useMiddleware(lateBoundRoutes);
        mainRouter.useMiddleware(app);

        container.state.mainRouter = mainRouter
        container.state.preAuthenticatedRouter = preAuthenticatedRouter;
        container.state.authenticationRouter = authenticationRouter;
        container.state.lateBoundRoutes = lateBoundRoutes;
        container.state.app = app;

        preAuthenticatedRouter.useMiddleware('/', new StaticFileMiddleware(null, { root: new URL('../../../views', import.meta.url), fallthrough: true }));
        // mainRouter.use('/api', function (_req, res)
        // {
        //     res.writeHead(404, 'Not found');
        //     return new Promise((resolve) =>
        //     {
        //         res.end(() => resolve(res));
        //     })
        // });
    });
    console.error('there is no router yet; Working in degraded mode');
}
