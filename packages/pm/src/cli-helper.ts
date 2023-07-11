import * as child_process from 'child_process'

export function spawnAsync(program: string, options: child_process.SpawnOptions, ...args: string[]): Promise<void>
{
    options = Object.assign({ stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true }, options);

    const stderrInherit = options.stdio[2] == 'inherit';
    if (stderrInherit)
        options.stdio = [options.stdio[0], options.stdio[1], 'pipe', ...options.stdio.slice(3)] as child_process.StdioOptions;

    return new Promise<void>((resolve, reject) =>
    {
        let err = ''
        const cp = child_process
            .spawn(program, args, options)
            .on('error', reject).on('exit', (code) =>
            {
                if (code == 0)
                    resolve()
                reject(new Error(program + ' exited with error code ' + code + '\n' + err))
            });
        cp.stderr.on('data', (chunk) =>
        {
            err += chunk;
        });

        if (stderrInherit)
            cp.stderr.pipe(process.stderr);
    })
}