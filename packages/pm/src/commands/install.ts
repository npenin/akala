import State from "../state";
import npmHelper from "../npm-helper";
import yarnHelper, { hasYarn } from "../yarn-helper";
import { Container } from "@akala/commands";
import discover from './discover';

export default async function install(this: State, packageName: string, pm: Container<State>): ReturnType<typeof discover>
{
    if (process.versions['pnp'] || await hasYarn())
    {
        await yarnHelper.install(packageName);
        return await pm.dispatch('discover', packageName) as ReturnType<typeof discover>;
    }
    else
    {
        await npmHelper.install(packageName);
        return await pm.dispatch('discover', packageName, 'node_modules') as ReturnType<typeof discover>;
    }
}
