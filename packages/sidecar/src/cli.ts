#!/usr/bin/env node
import { Cli } from '@akala/commands';
import * as path from 'path'

(async function ()
{
    const cli = await Cli.fromFileSystem(path.resolve(__dirname, '../cli.json'), path.join(__dirname, '../'));
    cli.program.useError(async (e, c) =>
    {
        if (c.options.verbose)
            console.error(e);
        else
            console.error(e['message'] || e);
    });
    try
    {
        await cli.start();
    }
    catch (e)
    {
        if (typeof (e) == 'undefined')
            console.error("wrong CLI usage");
        process.exit(1);
    }

})();