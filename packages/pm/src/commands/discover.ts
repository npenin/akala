import State from "../state";
import { join, isAbsolute, basename } from "path";
import { existsSync, promises as fs } from "fs";
import { description } from "../container";
import map from './map'
import { createRequire } from "module";

type Unpromise<T> = T extends Promise<infer X> ? X : never;
type mapReturn = Unpromise<ReturnType<typeof map>>;

export default async function discover(this: State, packageName: string, folder: string, pm: description.pm): Promise<mapReturn[] | mapReturn>
{
    var path = folder || process.cwd();

    var tmpRequire: ReturnType<typeof createRequire> | undefined = undefined;

    if (typeof tmpRequire == 'undefined')
    {
        tmpRequire = createRequire(path);
    }

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

    var moduleRequire = tmpRequire;

    var packageConfig = moduleRequire(packageName + '/package.json');
    delete moduleRequire.cache['./package.json'];

    if (packageConfig.commands)
    {
        switch (typeof packageConfig.commands)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('commands property must be of type object or string');

                return await Promise.all(Object.keys(packageConfig.commands).map(v => pm.dispatch('map', v, moduleRequire?.resolve(packageName + '/' + packageConfig.commands[v]), path, true)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve(packageName + '/' + packageConfig.commands), path, true);
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
                return Promise.all(Object.keys(packageConfig.bin).map(v => pm.dispatch('map', v, moduleRequire.resolve(packageName + '/' + packageConfig.bin[v]), path, false)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve(packageName + '/' + packageConfig.bin), path, false);
            default:
                throw new Error('bin property must be of type object or string');
        }
    }

    var commandsJsonFile = tryModuleRequireResolve(join(packageName, './commands.json'));
    if (commandsJsonFile)
        return pm.dispatch('map', packageName, moduleRequire.resolve(packageName + '/commands.json'), path, true);

    return pm.dispatch('map', packageName, moduleRequire.resolve(packageName + '/' + packageConfig.main), path, false);
};

exports.default.$inject = ['param.0', 'param.1', 'container']
