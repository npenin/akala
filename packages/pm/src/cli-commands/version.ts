import State from '../state.js';
import { join } from "path";


export default async function version(this: State, packageName: string, folder: string): Promise<string>
{
    const path = folder || this.config.containers['pm'][0];
    let packageConfig: { default: { version: string } };
    if (packageName == 'pm' || typeof packageName == 'undefined')
        packageConfig = await import('../../package.json');
    else
    {
        packageConfig = await import(join(path, 'node_modules', packageName, './package.json'));
        delete require.cache[join(path, 'node_modules', packageName, './package.json')];
    }
    return packageConfig.default.version;
}