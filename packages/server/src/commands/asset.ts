import { State } from "../state";
import { Container } from "@akala/commands";
import { join } from "path";
import { serveStatic } from "../master-meta";
import * as requireIfExists from 'require-optional'
import { FSWatcher, watch } from 'chokidar'
import { logger } from '../logger'
const chokidar: { watch: typeof watch } = requireIfExists('chokidar');

const log = logger('assets');

export var targetWatchers: { [key: string]: FSWatcher } = {};

export default async function register(this: State, container: Container<State>, route: string, path: string)
{
    await this.assets.injectWithNameAsync([route], async (asset: string[]) =>
    {
        if (typeof (asset) == 'undefined')
        {
            this.assets.register(route, asset = []);
        }

        log.info(`addind ${path} to ${route}`);

        asset.push(path);

        var cachePath = join('./build', route);
        if (this.mode === 'development')
        {
            if (!targetWatchers[route])
            {
                log.info(`starting to watch '${asset}'`)
                targetWatchers[route] = chokidar.watch(asset, { persistent: false, ignoreInitial: true });
                targetWatchers[route].on('change', function (path)
                {
                    log.info(`change detected in ${path}`)
                    container.dispatch('compile', cachePath, asset)
                })
            }
            else
                targetWatchers[route].add(path);
        }
        await container.dispatch('compile', cachePath, asset);

        if (this.preAuthenticatedRouter)
            this.preAuthenticatedRouter.useGet(route, serveStatic(cachePath, { fallthrough: false }));
    });
}