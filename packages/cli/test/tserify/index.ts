import program from '../..';
import * as akala from '@akala/core'
import * as fs from 'fs'
import { promisify } from 'util';


program.command('echo')
    .action(function (context)
    {
        console.log(context.args)
    })