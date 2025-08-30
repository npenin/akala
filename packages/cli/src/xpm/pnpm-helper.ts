import { platform } from "os";
import { stat } from 'fs';
import { promisify } from 'util';
import { spawnAsync } from '../cli-helper.js';
import { join } from 'path';

export function hasPnpm(path?: string): Promise<boolean>
{
    return promisify(stat)(join(path || process.cwd(), './pnpm-lock.yml')).then(f => f.isFile(), e => false)
}

let npm = 'pnpm';
if (platform() == 'win32')
    npm = 'pnpm.cmd';

export default
    {
        name: 'pnpm',
        async setup(path?: string, options?: { production?: boolean }): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'workspaces', 'focus', ...(options?.production ? ['--production'] : []));
        },
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
            await spawnAsync(npm, { cwd: path, shell: true }, 'update', packageName)
        },
        async link(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'link', packageName)
        },
        async info(packageName: string, path?: string): Promise<void>
        {
            await spawnAsync(npm, { cwd: path, shell: true }, 'info', packageName)
        }
    }
