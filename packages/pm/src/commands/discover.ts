import State from "../state";
import { join, isAbsolute, basename } from "path";
import { existsSync, promises as fs } from "fs";
import { description } from "../container";
import map from './map'
import { createRequire } from "module";
import { log } from "@akala/core";


type Unpromise<T> = T extends Promise<infer X> ? X : never;
type mapReturn = Unpromise<ReturnType<typeof map>>;

const debug = log('discover');


export default async function discover(this: State, packageName: string, folder: string, pm: description.pm): Promise<mapReturn[] | mapReturn>
{
    debug(arguments);

    var path = folder || process.cwd();

    debug(path);


    var tmpRequire: ReturnType<typeof createRequire> | undefined = undefined;
    if (existsSync(path))
        if (isAbsolute(packageName))
        {
            let stats = await fs.stat(packageName)
            if (stats.isFile())
                tmpRequire = createRequire(packageName);
            else
                tmpRequire = createRequire(join(packageName, './package.json'));
            packageName = basename(packageName);
        }
        else
        {
            let stats = await fs.stat(join(path, packageName))
            if (stats.isFile())
                tmpRequire = createRequire(join(path, packageName))
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

    var moduleRequire = tmpRequire;

    var packageConfig = moduleRequire('./package.json');
    delete moduleRequire.cache['./package.json'];

    if (packageConfig.commands)
    {
        switch (typeof packageConfig.commands)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('commands property must be of type object or string');

                return await Promise.all(Object.keys(packageConfig.commands).map(v => pm.dispatch('map', v, moduleRequire?.resolve(packageConfig.commands[v]), path, true)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve(packageConfig.commands), path, true);
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
                return Promise.all(Object.keys(packageConfig.bin).map(v => pm.dispatch('map', v, moduleRequire.resolve(packageConfig.bin[v]), path, false)));
            case 'string':
                return await pm.dispatch('map', packageName, moduleRequire.resolve(packageConfig.bin), path, false);
            default:
                throw new Error('bin property must be of type object or string');
        }
    }

    var commandsJsonFile = tryModuleRequireResolve(join(packageName, './commands.json'));
    if (commandsJsonFile)
        return pm.dispatch('map', packageName, moduleRequire.resolve('./commands.json'), path, true);

    return pm.dispatch('map', packageName, moduleRequire.resolve(packageConfig.main), path, false);
};

exports.default.$inject = ['param.0', 'param.1', 'container']
