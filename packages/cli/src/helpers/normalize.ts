import { createRequire } from 'module'
import * as path from 'path'

export default function normalize(mode: 'require' | 'requireMeta' | true, currentWorkingDirectory: string, value: string)
{
    switch (mode)
    {
        case 'require':
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value.toString());
        case 'requireMeta':
            return createRequire(path.resolve(currentWorkingDirectory) + '/').resolve(value.toString() + '/package.json');
        default:
        case true:
            return path.resolve(currentWorkingDirectory, value.toString());
    }
}