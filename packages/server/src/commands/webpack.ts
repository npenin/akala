import * as webpack from 'webpack'
import { State } from '../state'

var compiler: webpack.Compiler;
var watcher: webpack.Watching;

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

        if (target && !this.webpack.config.entry[target])
            this.webpack.config.entry[target] = this.assets.resolve(target).inputs;

        console.log(this.webpack.config)

        compiler = webpack(this.webpack.config);

        if (this.mode == "development")
        {
            watcher = compiler.watch({}, function (err)
            {
                console.error(err);
            })
        }
    }

    return await new Promise((resolve, reject) =>
    {
        compiler.run((err, stats) =>
        {
            console.error(err);
            if (err)
                reject(err);
            else
                resolve(this.webpack.config);
        })
    })
}