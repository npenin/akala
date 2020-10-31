import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";
import yarnHelper, { hasYarn } from "../yarn-helper";
import { createRequire } from "module";

export default async function link(this: State, packageName: string, folder: string, pm: Container<State>)
{

    if (await hasYarn(folder))
        await yarnHelper.install(packageName, folder);
    else
        await npmHelper.install(packageName, folder);

    return await pm.dispatch('discover', packageName, folder);
};

exports.default.$inject = ['param.0', 'param.1', '$container']
