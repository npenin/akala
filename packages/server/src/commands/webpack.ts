import * as webpack from 'webpack'
import { State } from '../state'
import { extend, Binding } from '@akala/core';
import { Asset } from './asset'
import * as path from 'path'
import HtmlPlugin = require('html-webpack-plugin');
import { CleanWebpackPlugin as CleanPlugin } from 'clean-webpack-plugin'
import CssExtractPlugin = require('mini-css-extract-plugin')

export var html = { title: 'Output management', xhtml: true, hash: true, inject: true, excludeChunks: ['sw'] };

export var config: webpack.Configuration = {
    entry: {},
    output: {
        path: path.resolve('./build'),
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
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.scss?$/,
                use: [CssExtractPlugin.loader, 'css-loader', 'sass-loader'],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CleanPlugin(),
        new HtmlPlugin(html),
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
};

var compiler: webpack.Compiler;
var watcher: webpack.Watching;

export default async function compile(this: State, target?: string, reload?: boolean, options?: webpack.Configuration)
{
    if (reload || !config.entry[target])
    {
        if (watcher)
        {
            await new Promise((resolve) =>
            {
                watcher.close(resolve);
                watcher = null;
            });
        }

        if (!config.entry[target])
            config.entry[target] = this.assets.resolve(target).inputs;

        compiler = webpack(config);

        if (this.mode == "development")
        {
            watcher = compiler.watch({}, function (err)
            {
                console.error(err);
            })
        }
    }

    return new Promise((resolve, reject) =>
    {
        compiler.run(function (err)
        {
            if (err)
                reject(err);
            else
                resolve();
        })
    })
}