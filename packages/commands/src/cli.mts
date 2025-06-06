#!/usr/bin/env -S node
import { fileURLToPath } from 'url'
import { Cli } from './index.js';
import fsHandler from '@akala/fs';

// switch (os.platform())
// {
//     default:
//         dirname = path.dirname(import.meta.url).substring('file:'.length) + '/';
//     case 'win32':
//         dirname = path.dirname(import.meta.url).substring('file:'.length) + '/';
//         break;
// }

const cli = await Cli.fromFileSystem(fileURLToPath(new URL('cli/', import.meta.url)), { fs: await fsHandler.process(new URL('../../', import.meta.url)) });
cli.program.option('verbose', { aliases: ['v'], needsValue: false }).useError(async (e, c) =>
{
    if (c.options.verbose)
        console.error(e);
    else
        console.error(e['message'] || e);
});
await cli.start();
