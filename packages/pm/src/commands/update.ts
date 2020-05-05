import State from "../state";
import helper from "../yarn-helper";
import { Container } from "@akala/commands";



export default async function update(this: State, packageName: string, folder: string, pm: Container<State>): Promise<string>
{
    var version = await pm.dispatch('version', packageName, folder);

    var path = folder || this.config.containers['pm'][0];
    await helper.update(packageName, path);

    await pm.dispatch('discover', packageName, folder)

    return 'updated from ' + version + ' to ' + await pm.dispatch('version', packageName, folder);
};

exports.default.$inject = ['param.0', 'param.1', 'container']
