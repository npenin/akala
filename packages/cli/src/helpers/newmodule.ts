import program from '../router/index.js';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import mkdirp from 'mkdirp';
import { spawn as spawnOld, SpawnOptions } from 'child_process';



const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);

function spawn(cmd: string, args: string[], options: SpawnOptions)
{
    return new Promise<void>((resolve, reject) =>
    {
        spawnOld(cmd, args, options).on('close', function (code, signal)
        {
            if (code == 0)
                resolve();
            else
                reject({ code: code, signal: signal });
        })
    })
}

const config = program.command('module');
config.command<{ name: string }>('new <name>')
    .action(async function (context)
    {
        function npm(...args: string[])
        {
            return spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', cwd: context.options.name });
        }

        function yarn(...args: string[])
        {
            return spawn(/^win/.test(process.platform) ? 'yarn.cmd' : 'yarn', args, { stdio: 'inherit', cwd: context.options.name });
        }

        await mkdirp(context.options.name);
        await mkdirp(context.options.name + '/src');
        await mkdirp(context.options.name + '/src/server');
        await mkdirp(context.options.name + '/src/client');

        await spawn('git', ['init'], { stdio: 'inherit', cwd: context.options.name });

        await copyFile(path.join(__dirname, '../../templates/newmodule/.gitignore'), context.options.name + '/.gitignore');
        await copyFile(path.join(__dirname, '../../templates/newmodule/.npmignore'), context.options.name + '/.npmignore');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/tsconfig.json'), context.options.name + '/src/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/server/tsconfig.json'), context.options.name + '/src/server/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/client/tsconfig.json'), context.options.name + '/src/client/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/server/index.ts'), context.options.name + '/src/server/index.ts');

        if (/@[^/]+/.test(context.options.name))
            await npm('init', '-y', '--scope', /@[^/]+/.exec(context.options.name)[0]);
        else
            await npm('init', '-y');

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const packagejson = require(process.cwd() + '/' + context.options.name + '/package.json');
        packagejson.main = 'dist/server/index.js';
        packagejson.types = 'dist/server/index.d.ts';
        packagejson.scripts = {
            "test": "echo \"Error: no test specified\"",
            "build:js": "tsc -p src",
            "build:js:routes": "browserify -x @akala/client -x @akala/core dist/client/routes.js -o dist/routes.js",
            "build:js:tile": "browserify -x @akala/client -x @akala/core -i @domojs/theme-default/dist/tile dist/client/tile.js -o dist/tile.js",
            "prepack": "npm run build",
            "build": "npm run build:js && npm run build:js:routes && npm run build:js:tile"
        };
        packagejson.license = "MIT";
        await writeFile(context.options.name + '/package.json', JSON.stringify(packagejson, null, 4));

        let useYarn = true;
        try
        {
            await yarn('--version');
        }
        catch (e)
        {
            useYarn = false;
        }

        if (useYarn)
        {
            yarn('add', '@akala/server')
            yarn('add', '@domojs/theme-default', '--peer')
        }
        else
        {
            await npm('install', '@akala/server');
            await npm('install', '@domojs/theme-default', '--save-peer');
        }
    });