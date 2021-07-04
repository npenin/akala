import State from '../state.js';
import { join, isAbsolute, basename, resolve } from "path";
import { existsSync, promises as fs } from "fs";
import pmContainer from '../container.js';
import map from './map.js'
import { createRequire } from "module";
import { log } from "@akala/core";


type Unpromise<T> = T extends Promise<infer X> ? X : never;
type mapReturn = Unpromise<ReturnType<typeof map>>;

const debug = log('discover');


export default async function discover(this: State, packageName: string, folder: string, pm: pmContainer.container): Promise<mapReturn[] | mapReturn>
{
    // eslint-disable-next-line prefer-rest-params
    debug(arguments);

    let path = folder || process.cwd();

    debug(path);

    let tmpRequire: ReturnType<typeof createRequire> | undefined = undefined;
    if (existsSync(path))
        if (isAbsolute(packageName))
        {
            const stats = await fs.stat(packageName)
            if (stats.isFile())
                tmpRequire = createRequire(packageName);
            else
                tmpRequire = createRequire(join(packageName, './package.json'));
            packageName = basename(packageName);
        }
        else
        {
            path = resolve(path);
            const stats = await fs.stat(join(path, packageName))
            if (stats.isFile())
                tmpRequire = createRequire(join(path, packageName));
            else
                tmpRequire = createRequire(join(path, packageName, './package.json'));
        }

    if (typeof tmpRequire == 'undefined')
        tmpRequire = createRequire(join(path, './package.json'));

    function tryModuleRequireResolve(p: string)
    {
        try
        {
            moduleRequire?.resolve(p)
        }
        catch (e)
        {
            return null;
        }
    }

    const moduleRequire = tmpRequire;

    const packageConfig = moduleRequire('./package.json');
    delete moduleRequire.cache['./package.json'];

    if (packageConfig.commands)
    {
        switch (typeof packageConfig.commands)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('commands property must be of type object or string');

                return await Promise.all(Object.keys(packageConfig.commands).map(v => pm.dispatch('map', v, moduleRequire?.resolve('./' + packageConfig.commands[v]), path, true)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve('./' + packageConfig.commands), path, true);
            default:
                throw new Error('commands property must be of type object or string');
        }
    }

    if (packageConfig.bin)
    {
        switch (typeof packageConfig.bin)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('bin property must be of type object or string');
                return Promise.all(Object.keys(packageConfig.bin).map(v => pm.dispatch('map', v, moduleRequire.resolve('./' + packageConfig.bin[v]), path, false)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve('./' + packageConfig.bin), path, false);
            default:
                throw new Error('bin property must be of type object or string');
        }
    }

    const commandsJsonFile = tryModuleRequireResolve(join(packageName, './commands.json'));
    if (commandsJsonFile)
        return pm.dispatch('map', packageName, moduleRequire.resolve('./commands.json'), path, true);

    return pm.dispatch('map', packageName, moduleRequire.resolve('./' + packageConfig.main), path, false);
}

exports.default.$inject = ['param.0', 'param.1', '$container']
