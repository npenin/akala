import program from './router';
import * as akala from '@akala/core'
import * as fs from 'fs'
import { promisify } from 'util';


program.command('client').command('api <name> <url>')
    .action(async function (context)
    {
        const http: akala.Http = akala.resolve('$http');
        const response = await http.get(context.params.url);
        const filePath = await promisify(fs.mkdtemp)('api', 'utf8');
        if (response.headers.has('content-type'))
            if (~response.headers.get('content-type').indexOf('text/javascript'))
            {
                program.process(['config', 'set', 'plugins.' + context.params.name, filePath + '/api.json']);
                await promisify(fs.writeFile)(filePath + '/api.json', await response.text());
            }
            else
            {
                program.process(['config', 'set', 'plugins.' + context.params.name, filePath + '/api.js']);
                await promisify(fs.writeFile)(filePath + '/api.js', await response.text());
            }
    });