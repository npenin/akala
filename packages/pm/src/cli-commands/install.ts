import type State from '../state.js';
import { Container } from "@akala/commands";
import discover from './discover.js';
import { xpm } from '@akala/cli';

export default async function install(this: State, packageName: string, pm: Container<State>): ReturnType<typeof discover>
{
    const xPM = await xpm(process.cwd());
    await xPM.install(packageName);

    if (!this.config.has('setup'))
        this.config.set('setup', { packages: [] })
    if (!this.config.has('setup.packages'))
        this.config.set('setup.packages', [])

    if (this.config.setup.packages.indexOf(packageName) == -1)
        this.config.setup.packages.push(packageName);

    return await pm.dispatch('discover', packageName, !process.versions['pnp'] && 'node_modules' || undefined);
}
