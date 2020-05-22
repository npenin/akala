import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";
import { hasYarn } from "./install";
import yarnHelper from "../yarn-helper";
import { createRequire } from "module";

export default async function link(this: State, packageName: string, folder: string, pm: Container<State>)
{

    if (await hasYarn())
        await yarnHelper.install(packageName, folder || process.cwd());
    else
        await npmHelper.install(packageName, folder || process.cwd());

    return await pm.dispatch('discover', packageName, createRequire(folder || process.cwd()))
};

exports.default.$inject = ['param.0', 'param.1', 'container']
