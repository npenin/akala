import { State } from "../state";
import { Container } from "@akala/commands";
import { join, isAbsolute, resolve, dirname } from "path";
import { serveStatic } from "../master-meta";
import * as requireIfExists from 'require-optional'
import { FSWatcher, watch } from 'chokidar'
import { logger } from '../logger'
import { description } from "../commands";
const chokidar: { watch: typeof watch } = requireIfExists('chokidar');

const log = logger('assets');

export var targetWatchers: { [key: string]: FSWatcher } = {};
export interface Asset
{
    inputs: string[];
    output: string;
};

export default async function register(this: State, container: Container<State> & description.commands, route: string, path: string, cwd: string)
{
    if (typeof route == 'undefined' && typeof path == 'undefined')
        return this.assets.toJSON();

    return await this.assets.injectWithName([route], async (asset: Asset) =>
    {
        if (typeof path == 'undefined')
            return asset;

        var newRoute = !asset;
        if (newRoute)
            asset = this.assets.register(route, { inputs: [], output: null });

        log.info(`adding ${path} to ${route}`);
        if (!isAbsolute(path))
            path = resolve(cwd, path);
        asset.inputs.push(path);

        asset.output = resolve(join('./build', route));
        // if (this.mode === 'development')
        // {
        //     if (!targetWatchers[route])
        //     {
        //         log.info(`starting to watch '${asset}'`)
        //         targetWatchers[route] = chokidar.watch(asset.inputs, { persistent: false, ignoreInitial: true });
        //         targetWatchers[route].on('change', function (path)
        //         {
        //             log.info(`change detected in ${path}`)
        //             container.dispatch('compile', cachePath, ...asset.inputs)
        //         })
        //     }
        //     else
        //         targetWatchers[route].add(path);
        // }

        await container.dispatch('webpack', route, true);

        if (newRoute)
            container.dispatch('route', route, resolve(asset.output), { fallthrough: false, pre: true, get: true }, cwd)
    })();
}