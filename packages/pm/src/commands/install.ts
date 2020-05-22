import State from "../state";
import npmHelper from "../npm-helper";
import yarnHelper from "../yarn-helper";
import { Container } from "@akala/commands";
import { join } from "path";
import { createRequire } from 'module'
import { exists } from "fs";
import { promisify } from "util";

export function hasYarn()
{
    return promisify(exists)('./yarn.lock');
}

export default async function install(this: State, packageName: string, pm: Container<State>)
{
    var path = process.cwd();

    if (await hasYarn())
        await yarnHelper.install(packageName, path);
    else
        await npmHelper.install(packageName, path);

    return await pm.dispatch('discover', packageName, createRequire(path))
};
