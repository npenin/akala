import program from './router';
import * as akala from '@akala/core'
import * as fs from 'fs'
import { promisify } from 'util';
import Module = require('module');
import { fork } from 'child_process';


program.command('worker').command('run <module> <url>')
    .action(async function (context)
    {
        process.argv = process.argv.slice(0, 1).concat([context.params.module, context.params.url]);
        fork(require.resolve('@akala/server/dist/start', Module['_nodeModulePaths'](process.cwd())));
    })