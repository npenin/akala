import program from './router/index.js';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import mock from 'mock-require'
import './helpers/repl';
import { buildCliContextFromProcess } from '.';

mock('@akala/core', akala);
// eslint-disable-next-line @typescript-eslint/no-var-requires
mock('@akala/core', require('./index'));

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

    program.process(buildCliContextFromProcess());
})();