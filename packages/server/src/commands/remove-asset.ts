import { State } from "../state";
import { Container } from "@akala/commands";
import { join } from "path";
import { serveStatic } from "../master-meta";
import { targetWatchers, Asset } from "./asset";


export default async function unregister(this: State, route: string, path: string)
{
    console.log(this.webpack.config.entry[route])

    if (this.webpack.config.entry[route])
        this.webpack.config.entry[route].splice(this.webpack.config.entry[route].indexOf(path), 1);
}