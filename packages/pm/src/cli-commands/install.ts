import type State from '../state.js';
import npmHelper from '@akala/cli/npm-helper';
import yarnHelper, { hasYarn } from '@akala/cli/yarn-helper';
import { Container } from "@akala/commands";
import discover from './discover.js';

export default async function install(this: State, packageName: string, pm: Container<State>): ReturnType<typeof discover>
{
    if (process.versions['pnp'] || await hasYarn())
    {
        await yarnHelper.install(packageName);
        if (!this.config.has('setup'))
            this.config.set('setup', { packages: [] })
        if (!this.config.has('setup.packages'))
            this.config.set('setup.packages', [])

        if (this.config.setup?.packages?.indexOf(packageName) == -1)
            this.config.setup.packages.push(packageName);
        return await pm.dispatch('discover', packageName, !process.versions['pnp'] && 'node_modules' || undefined);
    }
    else
    {
        await npmHelper.install(packageName);
        if (this.config.setup.packages.indexOf(packageName) == -1)
            this.config.setup.packages.push(packageName);
        return await pm.dispatch('discover', packageName, 'node_modules');
    }
}
