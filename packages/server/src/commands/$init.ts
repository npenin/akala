import { serve, Container } from "@akala/commands";
import { HttpRouter, router } from "../router";
import '../triggers/http'
import { State } from "../state";
import { Injector, Binding, log } from "@akala/core";
import * as webpack from './webpack'
import { join, resolve } from "path";
import HtmlPlugin = require('html-webpack-plugin');
import { CleanWebpackPlugin as CleanPlugin } from 'clean-webpack-plugin'
import CssExtractPlugin = require('mini-css-extract-plugin')
import { serveStatic } from "../master-meta";
import fs from 'fs';

const debug = log('akala:server')

export default async function $init(container: Container<State>, options: any)
{
    var stop = await serve(container, options);
    process.on('SIGINT', stop);

    container.state.assets = new Injector();
    var init = true;
    Binding.defineProperty(container.state, 'mode', options.mode || process.env.NODE_ENV).onChanged(function (ev)
    {
        if (!init)
            container.dispatch('webpack', undefined, true);
    });

    var indexHtmlPath: string;
    if (typeof process.versions['pnp'] != 'undefined')
        indexHtmlPath = require.resolve('../../views/index.html');
    else
        indexHtmlPath = resolve(__dirname, '../../views/index.html');

    var html = new HtmlPlugin({ title: 'Output management', template: indexHtmlPath, xhtml: true, hash: true, inject: true });


    container.state.webpack = {
        config: {
            entry: {},
            output: {
                path: join(process.cwd(), './build')
            },

            resolve: {
                aliasFields: ['browser'],
                // Add `.ts` and `.tsx` as a resolvable extension.
                extensions: [".ts", ".tsx", ".js", ".scss"],
                symlinks: false,
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/i,
                        use: require.resolve('ts-loader'),
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.s[ac]ss$/i,
                        use: [CssExtractPlugin.loader, require.resolve('css-loader'), {
                            loader: require.resolve('sass-loader'),
                            options: {
                                implementation: require('node-sass'),
                            },
                        },],
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.html$/,
                        use: require.resolve('raw-loader')
                    }
                ],
            },
            plugins: [
                new CleanPlugin(),
                html,
                new CssExtractPlugin({ moduleFilename: ({ name }) => `${name.replace('/js/', '/css/')}.css`, })
            ],
            devtool: 'source-map',
            mode: container.state.mode || 'development',
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
                    res.statusCode = 200;

                    fs.createReadStream(indexHtmlPath, { autoClose: true }).pipe(res);
                });
            else
                debug('started in production mode');
        }
        else
            console.error('there is no router; Working in degraded mode');

    })();
    return stop;
}