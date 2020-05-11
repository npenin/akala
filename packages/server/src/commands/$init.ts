import { serve, Container } from "@akala/commands";
import { HttpRouter, router } from "../router";
import '../triggers/http'
import { State } from "../state";
import { Injector, Binding } from "@akala/core";
import * as webpack from './webpack'
import { join } from "path";
import HtmlPlugin = require('html-webpack-plugin');
import { CleanWebpackPlugin as CleanPlugin } from 'clean-webpack-plugin'
import CssExtractPlugin = require('mini-css-extract-plugin')
import { serveStatic } from "../master-meta";
import PnpWebPackPlugin from 'pnp-webpack-plugin'

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

    var html = new HtmlPlugin({ title: 'Output management', template: require.resolve('@akala/server/views/index.html'), xhtml: true, hash: true, inject: true });

    container.state.webpack = {
        config: {
            entry: {},
            output: {
                path: join(process.cwd(), './build')
            },
            resolveLoader: {
                plugins: [PnpWebPackPlugin.moduleLoader(module)]
            },
            resolve: {
                plugins: [PnpWebPackPlugin],
                aliasFields: ['browser'],
                // Add `.ts` and `.tsx` as a resolvable extension.
                extensions: [".ts", ".tsx", ".js", ".scss"],
                symlinks: false,
            },
            module: {
                rules: [
                    {
                        test: /\.ts?$/,
                        use: 'ts-loader',
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.scss?$/,
                        use: [CssExtractPlugin.loader, 'css-loader', 'sass-loader'],
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.html$/,
                        use: 'raw-loader'
                    }
                ],
            },
            plugins: [
                new CleanPlugin(),
                html,
                new CssExtractPlugin({ moduleFilename: ({ name }) => `${name.replace('/js/', '/css/')}.css`, })
            ],
            devtool: 'source-map',
            mode: 'development',
            optimization: {
                usedExports: true,
                namedModules: true,
                namedChunks: true,
                sideEffects: true,
            },
        }, html: (html as any).options
    };

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

            preAuthenticatedRouter.useGet('/', serveStatic(null, { root: join(process.cwd(), './build'), fallthrough: true }));
            if (container.state.mode !== 'production')
                masterRouter.useGet('/', async function (req, res)
                {
                    const { PosixFS, ZipOpenFS } = await import(`@yarnpkg/fslib`);
                    const libzip = await (await import(`@yarnpkg/libzip`)).getLibzipPromise();

                    // This will transparently open zip archives
                    const zipOpenFs = new ZipOpenFS({ libzip });

                    // This will convert all paths into a Posix variant, required for cross-platform compatibility
                    const crossFs = new PosixFS(zipOpenFs);

                    res.statusCode = 200;

                    crossFs.createReadStream(require.resolve('../../views/index.html')).pipe(res);
                });
        }
        else
            console.error('there is no router; Working in degraded mode');
    })();
}