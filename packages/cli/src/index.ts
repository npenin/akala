#!/usr/bin/env node
import 'source-map-support/register'
import * as debug from 'debug';
debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
import program from './router';
// import './client';
// import './plugins';
// import './helpers/newmodule';
import './helpers/repl';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import mock from 'mock-require'
export default program;
require.cache[module.filename] = module;

mock('@akala/core', akala);

export interface CliConfig<T>
{
    command: string;
    param?: { [key in keyof T]: 'param' | 'args' | 'option' } | 'param' | 'args';
    type?: 'json' | 'xml';
}

(async function ()
{

    if (await promisify(fs.exists)('./config.json'))
    {
        const content = JSON.parse(await promisify(fs.readFile)('./config.json', 'utf-8'));
        if (content.plugins)
        {
            akala.each(content.plugins, function (plugin)
            {
                require(plugin);
            });
        }
    }

    program.process({ args: process.argv.slice(2), argv: process.argv, commandPath: process.argv0, options: {} });
})();