import webpack from 'webpack'
import { State } from '../state.js'
import { logger as debug } from '@akala/core';

let compiler: webpack.Compiler;
let watcher: webpack.Watching;

const log = debug('webpack');

export default async function compile(this: State, target?: string, reload?: boolean): Promise<webpack.Configuration>
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

        log.debug(this.webpack.config);

        compiler = webpack(this.webpack.config);

        if (this.mode == "development")
        {
            watcher = compiler.watch({ poll: true }, (err) =>
            {
                if (err)
                    console.error(err);
                else
                    log.debug(this.webpack.config);
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