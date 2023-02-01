#!/usr/bin/env node
import * as path from 'path'
import { Cli } from './index.js';

(async function ()
{
    const cli = await Cli.fromFileSystem(path.resolve(__dirname, '../commands.json'), path.join(__dirname, '../'));
    cli.program.useError(async (e, c) =>
    {
        if (c.options.verbose)
            console.error(e);
        else
            console.error(e['message'] || e);
    });
    await cli.start();

})();