import State from "../state";
import helper from "../yarn-helper";
import { Container } from "@akala/commands";
import { createRequire } from 'module'


export default async function install(this: State, packageName: string, pm: Container<State>)
{
    var path = process.cwd();
    await helper.install(packageName, path);

    return await pm.dispatch('discover', packageName, createRequire(path))
};
