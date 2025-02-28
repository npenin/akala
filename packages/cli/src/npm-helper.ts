import { platform } from "os";
import { spawnAsync } from './cli-helper.js';


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

let npm = 'npm';
if (platform() == 'win32')
    npm = 'npm.cmd';

export default
    {
        async install(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { shell: true }, 'i', packageName, '--prefix', path || process.cwd());
        },
        async uninstall(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { shell: true }, 'uninstall', packageName, '--prefix', path || process.cwd(), '--production');
        },
        async update(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { shell: true }, 'up', packageName, '--prefix', path || process.cwd(), '--production');
        },
        async link(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { shell: true, cwd: path || process.cwd() }, 'link', packageName)
        }
    }
