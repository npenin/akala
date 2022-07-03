import * as path from 'path'

export default function normalize(mode: 'require' | 'requireMeta' | true, currentWorkingDirectory: string, value: string)
{
    switch (mode)
    {
        case 'require':
        case 'requireMeta':
            throw new Error('require or requireMeta are not supported on client side');
        default:
        case true:
            return path.resolve(currentWorkingDirectory, value.toString());
    }
}