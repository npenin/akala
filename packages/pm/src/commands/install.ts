import State from "../state";
import npmHelper from "../npm-helper";
import { Container } from "@akala/commands";
import { join } from "path";



export default async function install(this: State, packageName: string, folder: string, pm: Container<State>)
{
    var path = folder || process.cwd();
    await npmHelper.install(packageName, path);

    return await pm.dispatch('discover', packageName, join(path, 'node_modules'))
};
