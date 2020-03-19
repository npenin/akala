import { State } from "../state";
import { Container } from "@akala/commands";
import { join } from "path";
import { serveStatic } from "../master-meta";
import { targetWatchers } from "./asset";


export default async function unregister(this: State, container: Container<State>, route: string, path: string)
{
    await this.assets.injectWithNameAsync([route], async (asset: string[]) =>
    {
        if (typeof (asset) == 'undefined')
        {
            this.assets.register(route, asset = []);
        }

        asset.splice(asset.indexOf(path), 1);

        var cachePath = join('./build', route);
        if (this.mode === 'development')
        {
            if (!targetWatchers[route])
                throw new Error('Impossible');
            else
                targetWatchers[route].unwatch(path);
        }

        await container.dispatch('compile', cachePath, asset);

        if (this.preAuthenticatedRouter)
            this.preAuthenticatedRouter.useGet(route, serveStatic(cachePath, { fallthrough: false }));
    });
}