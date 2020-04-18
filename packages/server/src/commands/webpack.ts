import * as webpack from 'webpack'
import { State } from '../state'
import { extend, Binding } from '@akala/core';
import { Asset } from './asset'
import * as path from 'path'

export function buildConfig(asset: Asset): webpack.Configuration
{
    return {
        entry: asset.inputs,
        output: {
            path: path.dirname(asset.output),
            filename: path.basename(asset.output),
        },

    }
}

var compilers: { [key: string]: { compiler: webpack.Compiler, whatcher?: webpack.Watching } } = {};

export default async function compile(this: State, target?: string, reload?: boolean, options?: webpack.Configuration)
{
    if (!target)
        return Promise.all(this.assets.keys()
            .filter(v => v !== '$injector')
            .map(route =>
            {
                console.log(route);
                return compile.call(this, target, reload, options);
            }));

    if (reload || !compilers[target])
    {
        if (compilers[target] && compilers[target].whatcher)
        {
            await new Promise((resolve) =>
            {
                compilers[target].whatcher.close(resolve);
            });
        }

        compilers[target] = {
            compiler: webpack(extend({
                mode: this.mode,
            } as webpack.Configuration, buildConfig(this.assets.resolve(target)), options))
        };

        if (this.mode == "development")
        {
            compilers[target].whatcher = compilers[target].compiler.watch({}, function (err)
            {
                if (err)
                    console.error(err);
            });
        }
    }
    return new Promise((resolve, reject) =>
    {
        compilers[target].compiler.run(function (err)
        {
            if (err)
                reject(err);
            else
                resolve();
        })
    })
}