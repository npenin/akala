import program from './router';
import { spawn } from 'child_process';

var ts = program
.command('ts <project>')
.action(function (context)
{
    spawn('tsc', ['-p', context.params.project], { shell: true, stdio: 'inherit' });
});

var browserify = program
.command('browserify <file> [...browserifyArgs]')
.action(function (context)
{
    spawn('browserify', [context.params.file].concat(context.params.browserifyArgs), { shell: true, stdio: 'inherit' })
})

program
.command('tserify <project> <file> [...browserifyArgs]')
.action(function (context)
{
    spawn('tsc', ['-p', context.params.project], { shell: true, stdio: 'inherit' }).on('exit', function (code)
    {
        if (code == 0)
            spawn('browserify',  [context.params.file].concat(context.params.browserifyArgs), { shell: true, stdio: 'inherit' })

    });
})