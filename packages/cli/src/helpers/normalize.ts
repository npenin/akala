import { createRequire } from 'module'
import * as path from 'path'
import { pathToFileURL, fileURLToPath } from 'url'

export default function normalize(mode: 'import' | 'require' | 'requireMeta' | boolean | { mode: 'path' | 'require' | 'requireMeta' | 'import', relativeTo?: string }, currentWorkingDirectory: string, value: string)
{
    if (typeof (mode) == 'object')
    {
        const absolute = normalize(mode.mode == 'path' || mode.mode, currentWorkingDirectory, value);
        if (mode.relativeTo)
        {
            try
            {
                new URL(absolute);
                return pathToFileURL('./' + path.relative('.', fileURLToPath(absolute)));
            }
            catch (e)
            {
                return path.relative('.', absolute);
            }
        }
        return absolute;
    }
    switch (mode)
    {
        case 'import':
            if (value.startsWith('.'))
                return new URL(value, 'file://' + currentWorkingDirectory + '/').toString();
            try
            {
                new URL(value)
                return value;
            }
            catch (e)
            {
                return value;
            }
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