import { createRequire } from 'module'
import * as path from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

export default function normalize(mode: 'import' | 'require' | 'requireMeta' | boolean | { mode: 'path' | 'require' | 'requireMeta' | 'import', relativeTo?: string }, currentWorkingDirectory: string, value: string)
{
    if (typeof (mode) == 'object')
    {
        const absolute = normalize(mode.mode == 'path' || mode.mode, mode.relativeTo && path.resolve(mode.relativeTo, currentWorkingDirectory) || currentWorkingDirectory, value);
        if (mode.relativeTo)
        {
            if (URL.canParse(absolute))
                return pathToFileURL('./' + path.relative('.', fileURLToPath(absolute)));
            return path.posix.relative('.', absolute);
        }
        return absolute;
    }
    switch (mode)
    {
        case 'import':
            if (value.startsWith('.'))
                return new URL(value, 'file://' + currentWorkingDirectory + '/').toString();
            if (URL.canParse(value))
                return value;
            if (import.meta.resolve)
                import.meta.resolve(value);
            // if (process.platform !== 'win32')
            return value;

        // debugger;
        // {
        //     let packageName = value;
        //     if (packageName[0] == '@')
        //     {
        //         packageName = packageName.split('/').slice(0, 2).join('/');
        //         import(packageName + '/package.json');
        //     }
        // }
        case 'require':
            // var values = value && value.split('/');
            // if (value && (value[0] == '@' && values.length > 2))
            //     return createRequire(path.dirname(normalize('requireMeta', currentWorkingDirectory, values.slice(0, 2).join('/')))).resolve('./' + values.slice(2).join('/'))
            // else if (value && (value[0] != '@' && values.length > 1))
            //     return createRequire(path.dirname(normalize('requireMeta', currentWorkingDirectory, values.shift()))).resolve('./' + values.join('/'))
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value);
        case 'requireMeta':
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value + '/package.json');
        case false:
            return value;
        default:
        case true:
            try
            {
                new URL(value);
                return value;
            }
            catch (e)
            {
                return path.resolve(currentWorkingDirectory, value);
            }
    }
}