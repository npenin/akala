import State from '../state.js';
import npmHelper from '../npm-helper.js';
import { Container } from "@akala/commands";
import yarnHelper, { hasYarn } from '../yarn-helper.js';
import discover from './discover.js';

export default async function link(this: State, packageName: string, folder: string, pm: Container<State>): ReturnType<typeof discover>
{

    if (await hasYarn(folder))
        await yarnHelper.install(packageName, folder);
    else
        await npmHelper.install(packageName, folder);

    return await pm.dispatch('discover', packageName, folder) as ReturnType<typeof discover>;
}

exports.default.$inject = ['param.0', 'param.1', '$container']
