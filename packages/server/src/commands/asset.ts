import { State } from '../state.js';
import { Container } from "@akala/commands";
import { isAbsolute, resolve } from "path";
import { FSWatcher } from 'chokidar'
import description from '../commands.js';
import { EntryObject } from "webpack";

export const targetWatchers: { [key: string]: FSWatcher } = {};
export interface Asset
{
    inputs: string[];
    output: string;
}

export default async function register(this: State, container: Container<State> & description.container, route: string, path: string, cwd: string): Promise<EntryObject>
{
    if (typeof route == 'undefined' && typeof path == 'undefined')
        return this.webpack.config.entry as EntryObject;

    if (typeof path == 'undefined')
        return this.webpack.config.entry[route];

    if (!isAbsolute(path))
        path = resolve(cwd, path);

    if (this.webpack.config.entry[route])
        this.webpack.config.entry[route].push(path)
    else
        this.webpack.config.entry[route] = [path];

    container.dispatch('webpack', null, true)

    return this.webpack.config.entry[route];
}