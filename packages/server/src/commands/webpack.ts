import webpack from 'webpack'
import { State } from '../state'
import { log as debug } from '@akala/core';

var compiler: webpack.Compiler;
var watcher: webpack.Watching;

const log = debug('webpack');

export default async function compile(this: State, target?: string, reload?: boolean)
{
    if (reload || target && !this.webpack.config.entry[target])
    {
        if (watcher)
        {
            await new Promise((resolve) =>
            {
                watcher.close(resolve);
                watcher = null;
            });
        }

        log(this.webpack.config);

        compiler = webpack(this.webpack.config);

        if (this.mode == "development")
        {
            watcher = compiler.watch({}, function (err, stats)
            {
                if (err)
                    console.error(err);
            })
        }
    }

    return await new Promise((resolve, reject) =>
    {
        compiler.run((err, stats) =>
        {
            if (err)
                console.error(err);
            // log(stats);
            if (err || stats.hasErrors())
                reject(err || stats.toJson());
            else
                resolve(this.webpack.config);
        })
    })
}