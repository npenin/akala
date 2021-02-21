import * as cp from 'child_process'
import { platform } from "os";
import { fstat, existsSync, exists } from 'fs';
import { promisify } from 'util';
import { spawnAsync } from './cli-helper';


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

function hasYarn()
{
    return promisify(exists)('./yarn.lock')
}

var npm = 'npm';
if (platform() == 'win32')
    npm = 'npm.cmd';

export default
    {
        async install(packageName: string, path?: string)
        {
            await spawnAsync(npm, {}, 'i', packageName, '--prefix', path || process.cwd(), '--production');

        },
        async update(packageName: string, path?: string)
        {
            await spawnAsync(npm, {}, 'up', packageName, '--prefix', path || process.cwd(), '--production');
        },
        async link(packageName: string, path?: string)
        {
            await spawnAsync(npm, { cwd: path || process.cwd() }, 'link', packageName)
        }
    }