#!/usr/bin/env node
import program, { buildCliContextFromProcess } from '@akala/cli';

process.setSourceMapsEnabled(true);

import { cli } from '@akala/cli/cli'
import { logger, LogLevels } from '@akala/core';

const context = buildCliContextFromProcess(logger.use('akala', LogLevels.help), { plugins: [] });
cli();

process.on('SIGINT', () => context.abort.abort('SIGINT'));
process.on('SIGTERM', () => context.abort.abort('SIGTERM'));

context.abort.signal.addEventListener('abort', () =>
{
    if (context.abort.signal.reason)
        if (typeof context.abort.signal.reason === 'string')
            console.warn('received ' + context.abort.signal.reason);
        else
            console.error(context.abort.signal.reason);
    else
        console.error('unhandled undefined result');
})

program.process(context).catch(e =>
{
    setImmediate(() => context.abort.abort(e));
});
