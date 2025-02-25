import State from '../state.js';
import npmHelper from '@akala/cli/npm-helper';
import { Container } from "@akala/commands";
import yarnHelper, { hasYarn } from '@akala/cli/yarn-helper';

export default async function update(this: State, packageName: string, folder: string, pm: Container<State>): Promise<string>
{
    const version = await pm.dispatch('version', packageName, folder);

    if (process.versions['pnp'] || await hasYarn(folder))
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
}