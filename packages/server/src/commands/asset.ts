import { State } from "../state";
import { Container } from "@akala/commands";
import { join, isAbsolute, resolve, dirname } from "path";
import { serveStatic } from "../master-meta";
import requireIfExists from 'require-optional'
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
        return this.webpack.config.entry;

    if (typeof path == 'undefined')
        return this.webpack.config.entry[route];

    if (!isAbsolute(path))
        path = resolve(cwd, path);

    if (this.webpack.config.entry[route])
        this.webpack.config.entry[route].push(path)
    else
        this.webpack.config.entry[route] = [path];

    return this.webpack.config.entry[route];
}