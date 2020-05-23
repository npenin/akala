import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";
import yarnHelper, { hasYarn } from "../yarn-helper";
import { createRequire } from "module";



export default async function update(this: State, packageName: string, folder: string, pm: Container<State>): Promise<string>
{
    var version = await pm.dispatch('version', packageName, folder);

    if (process.versions['pnp'])
        await yarnHelper.install(packageName, folder);
    else
        await npmHelper.install(packageName, folder);

    await pm.dispatch('discover', packageName, folder || process.cwd())

    return 'updated from ' + version + ' to ' + await pm.dispatch('version', packageName, folder);
};