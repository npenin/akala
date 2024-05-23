import { createRequire } from 'module'
import * as path from 'path/posix'
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
            return value;

        case 'require':
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
