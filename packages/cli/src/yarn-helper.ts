import { platform } from "os";
import { stat } from 'fs';
import { promisify } from 'util';
import { spawnAsync } from './cli-helper.js';
import { join } from 'path';


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

export function hasYarn(path?: string): Promise<boolean>
{
    return promisify(stat)(join(path || process.cwd(), './yarn.lock')).then(f => f.isFile(), e => false)
}

let npm = 'yarn';
if (platform() == 'win32')
    npm = 'yarn.cmd';

export default
    {
        async install(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'add', packageName)
        },
        async uninstall(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'remove', packageName)
        },
        async update(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'upgrade', packageName)
        },
        async link(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'link', packageName)
        }
    }
