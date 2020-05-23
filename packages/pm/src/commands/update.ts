import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";
import yarnHelper, { hasYarn } from "../yarn-helper";
import { createRequire } from "module";



export default async function update(this: State, packageName: string, folder: string, pm: Container<State>): Promise<string>
{
    var version = await pm.dispatch('version', packageName, folder);

    if (process.versions['pnp'])
    {
        await yarnHelper.update(packageName, folder);
        await pm.dispatch('discover', packageName)
    }
    else
    {
        await npmHelper.update(packageName, folder);
        await pm.dispatch('discover', packageName, 'node_modules')
    }

    return 'updated from ' + version + ' to ' + await pm.dispatch('version', packageName, folder);
};