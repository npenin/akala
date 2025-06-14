import fsHandler from "@akala/fs";
import { State } from "../state.js";
import { pathToFileURL } from 'url'
import path from "path";
import { CliContext } from "@akala/cli";

export default async function (this: State, context: CliContext)
{
    this.registry = { '': 'https://registry.npmjs.org/' };
    this.fs = await fsHandler.process(pathToFileURL(process.cwd() + path.sep))
    this.logger = context.logger;
    this.cacheFolder = this.fs.newChroot(path.join(context.currentWorkingDirectory + path.sep, './.cache/apm/'));
}
