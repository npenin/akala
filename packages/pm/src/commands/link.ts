import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";

export default async function link(this: State, packageName: string, folder: string, pm: Container<State>)
{
    var path = folder || this.config.containers['pm'][0];
    await npmHelper.link(packageName, path);

    return pm.dispatch('discover', packageName, folder)
};

exports.default.$inject = ['param.0', 'param.1', 'container']
