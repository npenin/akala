import State from "../state";
import npmHelper from "../npm-helper";
import yarnHelper, { hasYarn } from "../yarn-helper";
import { Container } from "@akala/commands";

export default async function install(this: State, packageName: string, pm: Container<State>)
{
    if (process.versions['pnp'] || await hasYarn())
    {
        await yarnHelper.install(packageName);
        return await pm.dispatch('discover', packageName)
    }
    else
    {
        await npmHelper.install(packageName);
        return await pm.dispatch('discover', packageName, 'node_modules')
    }
};
