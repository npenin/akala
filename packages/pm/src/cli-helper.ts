import * as cp from 'child_process'

export function spawnAsync(program: string, options: cp.SpawnOptions, ...args: string[]): Promise<void>
{
    options = Object.assign({ stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true }, options);

    return new Promise<void>((resolve, reject) =>
    {
        let err = ''
        cp
            .spawn(program, args, options)
            .on('error', reject).on('exit', (code) =>
            {
                if (code == 0)
                    resolve()
                reject(new Error(program + ' exited with error code ' + code + '\n' + err))
            }).stderr.on('data', (chunk) =>
            {
                err += chunk;
            });
    })
}