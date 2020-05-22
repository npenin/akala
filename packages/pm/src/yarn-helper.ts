import * as cp from 'child_process'
import { platform } from "os";
import { fstat, existsSync, exists } from 'fs';
import { promisify } from 'util';
import { spawnAsync } from './clli-helper';


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

function hasYarn()
{
    return promisify(exists)('./yarn.lock')
}

var npm = 'yarn';
if (platform() == 'win32')
    npm = 'yarn.cmd';

export default
    {
        async install(packageName: string, path: string)
        {
            await spawnAsync(npm, { cwd: path }, 'add', packageName, '--production')
        },
        async update(packageName: string, path: string)
        {
            await spawnAsync(npm, { cwd: path }, 'upgrade', packageName, '--production')
        },
        async link(packageName: string, path: string)
        {
            await spawnAsync(npm, { cwd: path }, 'link', packageName, '--production')
        }
    }