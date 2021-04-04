import program from './router';
import { spawn, SpawnOptions, ChildProcess } from 'child_process';

function start(command: string, options?: SpawnOptions): Promise<number>
function start(command: string, args?: ReadonlyArray<string>, options?: SpawnOptions): Promise<number>
function start(command: string, args?: ReadonlyArray<string> | SpawnOptions, options?: SpawnOptions): Promise<number> {
    const cp: ChildProcess = spawn.apply(this, arguments);
    return new Promise((resolve, reject) => {
        let hasError: any = null;
        cp.on('error', function (e) {
            hasError = e;
        });
        cp.on('exit', function (code) {
            if (hasError)
                reject(hasError);
            else
                resolve(code);
        });
    });
}

const ts = program
    .command('ts <project>')
    .action(function (context) {
        console.log(`typescript ${JSON.stringify(context.params)}`);
        return start('tsc', ['-p', context.params.project], { shell: true, stdio: 'inherit' });
    });

const browserify = program
    .command('browserify <file> [...browserifyArgs]')
    .action(function (context) {
        return start('browserify', [context.params.file].concat(context.params.browserifyArgs), { shell: true, stdio: 'inherit' })
    })

program
    .command('tserify <project> <file> [...browserifyArgs]')
    .action(function (context) {
        return start('tsc', ['-p', context.params.project], { shell: true, stdio: 'inherit' }).then(function (code) {
            if (code == 0)
                return start('browserify', [context.params.file].concat(context.params.browserifyArgs), { shell: true, stdio: 'inherit' })

        });
    });