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
    return promisify(stat)(join(path || process.cwd(), './yarn.lock')).then(f => f.isFile())
}

let npm = 'yarn';
if (platform() == 'win32')
    npm = 'yarn.cmd';

export default
    {
        async install(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path }, 'add', packageName, '--production')
        },
        async update(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path }, 'upgrade', packageName, '--production')
        },
        async link(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path }, 'link', packageName, '--production')
        }
    }