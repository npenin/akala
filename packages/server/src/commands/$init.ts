import { Container } from "@akala/commands";
import { router, HttpRouter } from '../router/index.js';
import '../triggers/http'
import { State } from '../state.js';
import { Injector, Binding, logger } from "@akala/core";
import { join, resolve } from "path";
import HtmlPlugin from 'html-webpack-plugin';
// import { CleanWebpackPlugin as CleanPlugin } from 'clean-webpack-plugin'
import CssExtractPlugin from 'mini-css-extract-plugin'
import fs from 'fs';
import { StaticFileMiddleware } from '../router/staticFileMiddleware.js';

const log = logger('akala:server')

export default async function $init(container: Container<State>, options: Record<string, unknown>, pm: Container<void>): Promise<void>
{
    container.state.pm = pm;
    // pm.register('$metadata', new CommandProxy(pm.processor, '$metadata'));

    container.state.assets = new Injector();
    let init = true;
    Binding.defineProperty(container.state, 'mode', options.mode || process.env.NODE_ENV).onChanged(function ()
    {
        if (!init)
            container.dispatch('webpack', undefined, true);
    });

    let indexHtmlPath: string;
    if (typeof process.versions['pnp'] != 'undefined')
        indexHtmlPath = require.resolve('../../views/index.html');
    else
        indexHtmlPath = resolve(__dirname, '../../views/index.html');

    const html = new HtmlPlugin({ title: 'Output management', template: indexHtmlPath, xhtml: true, hash: true, inject: true });

    container.state.webpack = {
        config: {
            entry: {},
            output: {
                path: join(process.cwd(), './build')
            },

            resolve: {
                aliasFields: ['browser'],
                // Add `.ts` and `.tsx` as a resolvable extension.
                extensions: [".ts", ".tsx", ".js", ".css"],
                symlinks: false,
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/i,
                        use: require.resolve('ts-loader'),
                    },
                    {
                        test: /\.js$/i,
                        enforce: 'pre',
                        use: require.resolve('source-map-loader'),
                    },
                    // {
                    //     test: /\.s[ac]ss$/i,
                    //     use: [
                    //         CssExtractPlugin.loader,
                    //         require.resolve('css-loader'),
                    //         {
                    //             loader: require.resolve('sass-loader'),
                    //             options: {
                    //                 implementation: require('node-sass'),
                    //             },
                    //         },
                    //     ],
                    // },
                    {
                        test: /\.html$/,
                        use: require.resolve('raw-loader')
                    }
                ],
            },
            plugins: [
                // new CleanPlugin(),
                html,
                new CssExtractPlugin()
            ],
            devtool: 'source-map',
            mode: container.state.mode || 'development',
            optimization: {
                usedExports: true,
                // namedModules: true,
                // namedChunks: true,
                sideEffects: true,
            },
        }, html: html.options
    };

    init = false;

    container.onResolve('$masterRouter', function (masterRouter: HttpRouter)
    {
        log.info('router registered, initializing web server...');
        const lateBoundRoutes = router();
        const preAuthenticatedRouter = router();
        const authenticationRouter = router();
        const app = router();
        container.register('$preAuthenticationRouter', preAuthenticatedRouter);
        container.register('$authenticationRouter', authenticationRouter);
        container.register('$router', lateBoundRoutes);
        masterRouter.useMiddleware(preAuthenticatedRouter);
        masterRouter.useMiddleware(authenticationRouter);
        masterRouter.useMiddleware(lateBoundRoutes);
        masterRouter.useMiddleware(app);

        container.state.masterRouter = masterRouter
        container.state.preAuthenticatedRouter = preAuthenticatedRouter;
        container.state.authenticationRouter = authenticationRouter;
        container.state.lateBoundRoutes = lateBoundRoutes;
        container.state.app = app;

        preAuthenticatedRouter.useMiddleware('/', new StaticFileMiddleware(null, { root: join(process.cwd(), './build'), fallthrough: true }));
        // masterRouter.use('/api', function (_req, res)
        // {
        //     res.writeHead(404, 'Not found');
        //     return new Promise((resolve) =>
        //     {
        //         res.end(() => resolve(res));
        //     })
        // });
        if (container.state.mode !== 'production')
            masterRouter.use('/', async function (_req, res)
            {
                res.statusCode = 200;

                fs.createReadStream(html['options'].template.substring(html['options'].template.indexOf('!') + 1), { autoClose: true }).pipe(res);
                return res;
            });
        else
            log.info('started in production mode');
    });
    console.error('there is no router yet; Working in degraded mode');
}