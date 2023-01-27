import { createRequire } from 'module'
import * as path from 'path'

export default function normalize(mode: 'require' | 'requireMeta' | true, currentWorkingDirectory: string, value: string)
{
    switch (mode)
    {
        case 'require':
            var values = value && value.split('/');
            if (value && (value[0] == '@' && values.length > 2))
                return path.resolve(path.dirname(normalize('requireMeta', currentWorkingDirectory, values.slice(0, 2).join('/'))), './' + values.slice(2).join('/'))
            else if (value && (value[0] != '@' && values.length > 1))
                return path.resolve(path.dirname(normalize('requireMeta', currentWorkingDirectory, values.shift())), './' + values.join('/'))
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value);
        case 'requireMeta':
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value + '/package.json');
        default:
        case true:
            const url = new URL(value);
            if (url.protocol)
                return value;
            return path.resolve(currentWorkingDirectory, value);
    }
}