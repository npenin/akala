#!/usr/bin/env node
import { program as cli, buildCliContextFromProcess } from '@akala/cli'
import { logger as LoggerBuilder, LogLevels } from '@akala/core';
import akala from './akala.mjs'

(async function ()
{
    const logger = LoggerBuilder('automate-cli', LogLevels.info)

    akala({}, cli);

    cli.format(async r =>
    {
        console.log('%O', r);
    });
    try
    {
        await cli.process(buildCliContextFromProcess(logger));
    }
    catch (e)
    {
        console.error(e);
        process.exit(1);
    }
})();