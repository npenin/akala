import { State } from "../state";
import { Container } from "@akala/commands";
import { join } from "path";
import { serveStatic } from "../master-meta";
import { targetWatchers, Asset } from "./asset";


export default async function unregister(this: State, container: Container<State>, route: string, path: string)
{
    await this.assets.injectWithName([route], async (asset: Asset) =>
    {
        if (typeof (asset) == 'undefined')
            return;

        console.log(this.webpack.config.entry[route])
        this.webpack.config.entry[route].splice(this.webpack.config.entry[route].indexOf(path), 1);

        await container.dispatch('compile', asset.output);
    })();
}