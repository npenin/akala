import * as cp from 'child_process'
import { platform } from "os";
import { fstat, existsSync, exists } from 'fs';
import { promisify } from 'util';
import { spawnAsync } from './cli-helper';
import { join } from 'path';


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

export function hasYarn(path?: string)
{
    return promisify(exists)(join(path || process.cwd(), './yarn.lock'))
}

var npm = 'yarn';
if (platform() == 'win32')
    npm = 'yarn.cmd';

export default
    {
        async install(packageName: string, path?: string)
        {
            await spawnAsync(npm, { cwd: path }, 'add', packageName, '--production')
        },
        async update(packageName: string, path?: string)
        {
            await spawnAsync(npm, { cwd: path }, 'upgrade', packageName, '--production')
        },
        async link(packageName: string, path?: string)
        {
            await spawnAsync(npm, { cwd: path }, 'link', packageName, '--production')
        }
    }