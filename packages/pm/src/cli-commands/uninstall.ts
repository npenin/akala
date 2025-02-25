import State from '../state.js';
import npmHelper from '@akala/cli/npm-helper';
import yarnHelper, { hasYarn } from '@akala/cli/yarn-helper';
import { Container } from "@akala/commands";

export default async function uninstall(this: State, packageName: string, pm: Container<State>): Promise<void>
{

    const config = this.config.extract();
    const containers = Object.entries(config.containers);
    const removedContainers = containers.filter(e => !e[1].path.includes('node_modules/' + packageName));
    config.containers = Object.fromEntries(containers.filter(e => !e[1].path.includes('node_modules/' + packageName)))
    this.config.set('containers', config.containers);

    const mappings = Object.entries(this.config.mapping.extract()).filter(e => !removedContainers.find(c => e[1].container == c[0]));
    this.config.set('mapping', Object.entries(mappings));

    this.config.setup.set('packages', this.config.setup.packages.filter(p => p != packageName))

    if (process.versions['pnp'] || await hasYarn())
        await yarnHelper.uninstall(packageName);
    else
        await npmHelper.uninstall(packageName);

    await this.config.commit();
}
