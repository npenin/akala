import program from '../router';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import { write } from 'fs';
import * as akala from '@akala/core'
import * as mkdirpOld from 'mkdirp';
import { spawn as spawnOld, SpawnOptions } from 'child_process';
import { EOL } from 'os'



const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);
const mkdirp = promisify(mkdirpOld);

function spawn(cmd: string, args: string[], options: SpawnOptions)
{
    return new Promise((resolve, reject) =>
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

var config = program.command('module');
config.command('new <name>')
    .action(async function (context, next)
    {
        function npm(...args: string[])
        {
            return spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', cwd: context.params.name });
        }

        function yarn(...args: string[])
        {
            return spawn(/^win/.test(process.platform) ? 'yarn.cmd' : 'yarn', args, { stdio: 'inherit', cwd: context.params.name });
        }

        await mkdirp(context.params.name);
        await mkdirp(context.params.name + '/src');
        await mkdirp(context.params.name + '/src/server');
        await mkdirp(context.params.name + '/src/client');

        await spawn('git', ['init'], { stdio: 'inherit', cwd: context.params.name });

        await copyFile(path.join(__dirname, '../../templates/newmodule/.gitignore'), context.params.name + '/.gitignore');
        await copyFile(path.join(__dirname, '../../templates/newmodule/.npmignore'), context.params.name + '/.npmignore');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/tsconfig.json'), context.params.name + '/src/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/server/tsconfig.json'), context.params.name + '/src/server/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/client/tsconfig.json'), context.params.name + '/src/client/tsconfig.json');
        await copyFile(path.join(__dirname, '../../templates/newmodule/src/server/index.ts'), context.params.name + '/src/server/index.ts');

        if (/@[^\/]+/.test(context.params.name))
            await npm('init', '-y', '--scope', /@[^\/]+/.exec(context.params.name)[0]);
        else
            await npm('init', '-y');

        var packagejson = require(process.cwd() + '/' + context.params.name + '/package.json');
        packagejson.main = 'dist/server/index.js';
        packagejson.types = 'dist/server/index.d.ts';
        packagejson.scripts = {
            "test": "echo \"Error: no test specified\"",
            "build:js": "tsc -p src",
            "build:js:routes": "browserify -x @akala/client -x @akala/core dist/client/routes.js -o dist/routes.js",
            "build:js:tile": "browserify -x @akala/client -x @akala/core -i @domojs/theme-default/dist/tile dist/client/tile.js -o dist/tile.js",
            "prepublishOnly": "npm run build",
            "build": "npm run build:js && npm run build:js:routes && npm run build:js:tile"
        };
        packagejson.license = "MIT";
        await writeFile(context.params.name + '/package.json', JSON.stringify(packagejson, null, 4));

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