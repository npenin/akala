import { platform } from "os";
import { spawnAsync } from '../cli-helper.js';
import { Writable } from "stream";
import { packagejson } from "@akala/core";


// if (typeof (process.versions.pnp) != 'undefined')
// {

// }

let npm = 'npm';
if (platform() == 'win32')
    npm = 'npm.cmd';

export default
    {
        name: 'npm',
        async setup(path?: string, options?: { production?: boolean }): Promise<void>
        {
            await spawnAsync(npm, { shell: true }, 'i', '--prefix', path || process.cwd(), ...(options?.production ? ['--production'] : []));
        },
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
        },
        async info(packageName: string, path?: string): Promise<packagejson.CoreProperties>
        {
            let stdoutString = '';
            const stdout = new Writable({
                defaultEncoding: 'utf-8', write(chunk, encoding, callback)
                {
                    try
                    {
                        if (typeof chunk == 'string')
                            stdoutString += chunk;
                        else
                            stdoutString += chunk.toString(encoding);
                        callback();
                    }
                    catch (e)
                    {
                        callback(e)
                    }
                },
            })
            await spawnAsync(npm, { stdio: ['ignore', stdout, 'pipe'], shell: true, cwd: path || process.cwd() }, 'info', packageName, '--json');

            return JSON.parse(stdoutString);
        }
    }
