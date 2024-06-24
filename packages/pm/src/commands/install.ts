import State from '../state.js';
import npmHelper from '../npm-helper.js';
import yarnHelper, { hasYarn } from '../yarn-helper.js';
import { Container } from "@akala/commands";
import discover from './discover.js';

export default async function install(this: State, packageName: string, pm: Container<State>): ReturnType<typeof discover>
{
    if (process.versions['pnp'] || await hasYarn())
    {
        await yarnHelper.install(packageName);
        return await pm.dispatch('discover', packageName, !process.versions['pnp'] && 'node_modules' || undefined);
    }
    else
    {
        await npmHelper.install(packageName);
        return await pm.dispatch('discover', packageName, 'node_modules');
    }
}
