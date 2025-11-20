import { pathToFileURL } from 'url';
import pmContainer from '../container.js';
import map from './map.js'
import { logger } from "@akala/core";
import fsHandler, { hasAccess, OpenFlags } from "@akala/fs";


type Unpromise<T> = T extends Promise<infer X> ? X : never;
type mapReturn = Unpromise<ReturnType<typeof map>>;

const log = logger.use('discover');


export default async function discover(path: string | URL, pm: pmContainer.container, name?: string, cwd?: string): Promise<mapReturn[] | mapReturn>
{
    // eslint-disable-next-line prefer-rest-params
    log.debug(arguments);

    const moduleFs = await fsHandler.process(new URL(path + '/', pathToFileURL((cwd || process.cwd()) + '/')));

    const packageConfig = await moduleFs.readFile<any>('./package.json', { encoding: 'json' })

    if (packageConfig.commands)
    {
        switch (typeof packageConfig.commands)
        {
            case 'object':
                if (Array.isArray(packageConfig))
                    throw new Error('commands property must be of type object or string');

                return await Promise.all(Object.keys(packageConfig.commands).map(v => pm.dispatch('map', v, new URL(packageConfig.commands[v], moduleFs.root), 'nodejs', null, { commandable: true })));
            case 'string':
                return await pm.dispatch('map', name ?? packageConfig.name, new URL(packageConfig.commands, moduleFs.root), 'nodejs', null, { commandable: true });
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
                return Promise.all(Object.keys(packageConfig.bin).map(v => pm.dispatch('map', v, new URL(packageConfig.bin[v], moduleFs.root), 'nodejs', null, { commandable: false })));
            case 'string':
                return await pm.dispatch('map', name ?? packageConfig.name, new URL('./' + packageConfig.bin, moduleFs.root), 'nodejs', null, { commandable: false });
            default:
                throw new Error('bin property must be of type object or string');
        }
    }

    if (await hasAccess(moduleFs, './commands.json', OpenFlags.Read))
        return pm.dispatch('map', name ?? packageConfig.name, new URL('./commands.json', moduleFs.root), 'nodejs', null, { commandable: true });

    return pm.dispatch('map', name ?? packageConfig.name, new URL('./' + packageConfig.main, moduleFs.root), 'nodejs', null, { commandable: false });
}
