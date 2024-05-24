#!/usr/bin/env -S node
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Cli } from './index.js';

const dirname: string = path.dirname(fileURLToPath(import.meta.url)) + '/';// = path.dirname(import.meta.url).substring('file:'.length) + '/';
// switch (os.platform())
// {
//     default:
//         dirname = path.dirname(import.meta.url).substring('file:'.length) + '/';
//     case 'win32':
//         dirname = path.dirname(import.meta.url).substring('file:'.length) + '/';
//         break;
// }

(async function (dirname)
{
    const cli = await Cli.fromFileSystem(path.resolve(dirname, '../../commands.json'));
    cli.program.option('verbose', { aliases: ['v'], needsValue: false }).useError(async (e, c) =>
    {
        if (c.options.verbose)
            console.error(e);
        else
            console.error(e['message'] || e);
    });
    await cli.start();
})(dirname);