import { createRequire } from 'module'
import * as path from 'path'

export default function normalize(mode: 'require' | 'requireMeta' | boolean, currentWorkingDirectory: string, value: string)
{
    switch (mode)
    {
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