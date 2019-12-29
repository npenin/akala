import State from "../state";
import { join } from "path";
import { existsSync } from "fs";
import { description } from "../container";
import map from './map'

type Unpromise<T> = T extends Promise<infer X> ? X : never;
type mapReturn = Unpromise<ReturnType<typeof map>>;

export default async function discover(this: State, packageName: string, folder: string, pm: description.pm): Promise<mapReturn[] | mapReturn>
{
    var path = folder || this.config.containers['pm'][0];

    if (existsSync(join(path, 'node_modules', packageName, './commands.json')))
        return pm.dispatch('map', packageName, join(path, 'node_modules', packageName, './commands.json'), false);

    var packageConfig = require(join(path, 'node_modules', packageName, './package.json'));
    delete require.cache[join(path, 'node_modules', packageName, './package.json')];
    if (packageConfig.bin)
    {
        switch (typeof packageConfig.bin)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('bin property must be of type object or string');
                return Promise.all(Object.keys(packageConfig.bin).map(v => pm.dispatch('map', v, join(path, 'node_modules', packageName, packageConfig.bin[v]), false)));
            case 'string':
                return await pm.dispatch('map', packageName, join(path, 'node_modules', packageName, packageConfig.bin), false);
            default:
                throw new Error('bin property must be of type object or string');
        }
    }
    if (packageConfig.commands)
    {
        switch (typeof packageConfig.commands)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('commands property must be of type object or string');

                return await Promise.all(Object.keys(packageConfig.commands).map(v => pm.dispatch('map', v, join(path, 'node_modules', packageName, packageConfig.commands[v]), true)));
            case 'string':
                return await pm.dispatch('map', packageName, join(path, 'node_modules', packageName, packageConfig.commands), true);
            default:
                throw new Error('commands property must be of type object or string');
        }
    }
    return pm.dispatch('map', packageName, join(path, 'node_modules', packageName, packageConfig.main), false);
};

exports.default.$inject = ['param.0', 'param.1', 'container']
