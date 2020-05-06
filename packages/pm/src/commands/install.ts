import State from "../state";
import helper from "../yarn-helper";
import { Container } from "@akala/commands";

export default async function install(this: State, packageName: string, pm: Container<State>)
{
    var path = process.cwd();
    await helper.install(packageName, path);
    return await pm.dispatch('discover', packageName, path)
};
