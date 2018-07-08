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

        await writeFile(context.params.name + '/.gitignore', ['node_modules',
            'dist',
            'test/**/*.js',
            'test/**/*.js.map',
            'yarn-error.log',
            'config.json'].join(EOL), { encoding: 'utf8' });

        await writeFile(context.params.name + '/.npmignore', ['!dist', 'test'].join(EOL), { encoding: 'utf8' });

        await writeFile(context.params.name + '/src/tsconfig.json', JSON.stringify({
            "compileOnSave": true,
            "compilerOptions": {
                "rootDir": ".",
                "experimentalDecorators": true,
                "sourceMap": true,
                "target": "es6",
                "moduleResolution": "node",
                "module": "commonjs",
                "outDir": "../dist"
            },

            "exclude": [
                "node_modules"
            ]
        }, null, 4));

        await writeFile(context.params.name + '/src/server/tsconfig.json', JSON.stringify({
            "compileOnSave": true,
            "compilerOptions": {
                "rootDir": ".",
                "target": "es6",
                "module": "commonjs",
                "moduleResolution": "node",
                "declaration": true
            }
        }
            , null, 4));

        await writeFile(context.params.name + '/src/client/tsconfig.json', JSON.stringify({
            "compileOnSave": true,
            "compilerOptions": {
                "rootDir": ".",
                "outDir": "../../dist/client",
                "target": "es6",
                "module": "commonjs",
                "moduleResolution": "node",
                "declaration": true,
            }
        }
            , null, 4));

        await writeFile(context.params.name + '/src/server/index.ts', "import * as akala from '@akala/server';\r\
import { AssetRegistration } from '@akala-modules/core';\r\
import { EventEmitter } from 'events';\r\
\r\
akala.injectWithName(['$isModule', '$master', '$worker'], function (isModule: akala.worker.IsModule, master: akala.worker.MasterRegistration, worker: EventEmitter)\r\
{\r\
    if (isModule('"+ context.params.name + "'))\r\
    {\r\
        worker.on('ready', function ()\r\
        {\r\
            // Called when all modules have been initialized\r\
        });\r\
        master(__filename, './master');\r\
\r\
        akala.injectWithName([AssetRegistration.name], function (virtualasset: PromiseLike<AssetRegistration>)\r\
        {\r\
            virtualasset.then((va) =>\r\
            {\r\
                va.register('/js/tiles.js', require.resolve('../tile'));\r\
                va.register('/js/routes.js', require.resolve('../routes'));\r\
            });\r\
        })();\r\
\r\
    }\r\
})()");

        await npm('init', '-y', '--scope', /@[^\/]+/.exec(context.params.name)[0])

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