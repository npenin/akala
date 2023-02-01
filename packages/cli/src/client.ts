import program from './router/index.js';
import * as akala from '@akala/core'
import * as fs from 'fs'
import { promisify } from 'util';


program.command('client').command<{ name: string, url: string }>('api <name> <url>')
    .action(async function (context)
    {
        const http: akala.Http = akala.defaultInjector.resolve('$http');
        const response = await http.get(context.options.url);
        const filePath = await promisify(fs.mkdtemp)('api', 'utf8');
        if (response.headers.has('content-type'))
            if (~response.headers.get('content-type').indexOf('text/javascript'))
            {
                program.process({ args: ['config', 'set', 'plugins.' + context.options.name, filePath + '/api.json'], argv: [], options: {}, currentWorkingDirectory: undefined, logger: context.logger });
                await promisify(fs.writeFile)(filePath + '/api.json', await response.text());
            }
            else
            {
                program.process({ args: ['config', 'set', 'plugins.' + context.options.name, filePath + '/api.js'], argv: [], options: {}, currentWorkingDirectory: undefined, logger: context.logger });
                await promisify(fs.writeFile)(filePath + '/api.js', await response.text());
            }
    });