import * as cp from 'child_process'

export async function spawnAsync(program: string, options: cp.SpawnOptions, ...args: string[])
{
    options = Object.assign({ stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true }, options);

    await new Promise((resolve, reject) =>
    {
        var err = ''
        cp
            .spawn(program, args, options)
            .on('error', reject).on('exit', (code) =>
            {
                if (code == 0)
                    resolve()
                reject(new Error('yarn exited with error code ' + code + '\n' + err))
            }).stderr.on('data', (chunk) =>
            {
                err += chunk;
            });
    })
}