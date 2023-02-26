import program from './router/index.js';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import './helpers/repl';
import { buildCliContextFromProcess } from './index.js';

(async function ()
{
    if (await promisify(fs.exists)('./config.json'))
    {
        const content = JSON.parse(await promisify(fs.readFile)('./config.json', 'utf-8'));
        if (content.plugins)
        {
            await akala.eachAsync(content.plugins, async function (plugin)
            {
                await import(plugin);
            });
        }
    }

    program.process(buildCliContextFromProcess()).catch(err =>
    {
        if (err.statusCode)
            process.exit(err.statusCode);
        else
            process.exit(500);
    });
})();