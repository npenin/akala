import * as cp from 'child_process'
import { platform } from "os";

var npm = 'npm';
if (platform() == 'win32')
    npm = 'npm.cmd';

export default
    {
        async install(packageName: string, path: string)
        {
            await new Promise((resolve, reject) =>
            {
                var err = ''
                cp
                    .spawn(npm, ['i', packageName, '--prefix', path, '--production'], { stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true })
                    .on('error', reject).on('exit', (code) =>
                    {
                        if (code == 0)
                            resolve()
                        reject(new Error('npm exited with error code ' + code + '\n' + err))
                    }).stderr.on('data', (chunk) =>
                    {
                        err += chunk;
                    });
            })

        },
        async update(packageName: string, path: string)
        {
            await new Promise((resolve, reject) =>
            {
                var err = ''
                cp
                    .spawn(npm, ['up', packageName, '--prefix', path, '--production'], { stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true })
                    .on('error', reject).on('exit', (code) =>
                    {
                        if (code == 0)
                            resolve()
                        reject(new Error('npm exited with error code ' + code + '\n' + err))
                    }).stderr.on('data', (chunk) =>
                    {
                        err += chunk;
                    });
            })

        },
        async link(packageName: string, path: string)
        {
            await new Promise((resolve, reject) =>
            {
                var err = ''
                cp
                    .spawn(npm, ['link', packageName], { cwd: path, stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true })
                    .on('error', reject).on('exit', (code) =>
                    {
                        if (code == 0)
                            resolve()
                        reject(new Error('npm exited with error code ' + code + '\n' + err))
                    }).stderr.on('data', (chunk) =>
                    {
                        err += chunk;
                    });
            })

        }
    }