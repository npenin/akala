import program from './router/index';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import './helpers/repl';
import { buildCliContextFromProcess } from '.';

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

    program.process(buildCliContextFromProcess()).catch(err =>
    {
        if (err.statusCode)
            process.exit(err.statusCode);
        else
            process.exit(500);
    });
})();