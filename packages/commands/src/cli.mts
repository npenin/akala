#!/usr/bin/env -S node
import * as path from 'path'
import { Cli } from './index.js';

const dirname = path.dirname(import.meta.url).substring('file:'.length) + '/';

(async function (dirname)
{
    const cli = await Cli.fromFileSystem(path.resolve(dirname, '../../commands.json'));
    cli.program.useError(async (e, c) =>
    {
        if (c.options.verbose)
            console.error(e);
        else
            console.error(e['message'] || e);
    });
    await cli.start();
})(dirname);