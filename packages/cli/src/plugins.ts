import program from './router';
import * as akala from '@akala/core'
import * as fs from 'fs'
import { promisify } from 'util';
import { resolve } from 'path';


program.command('plugins').command('add <name> <path>')
    .action(async function (context)
    {
        program.process(['config', 'set', 'plugins.' + context.params.name, resolve(context.params.path)]);
    })