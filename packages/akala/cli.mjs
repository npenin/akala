#!/usr/bin/env -S node --enable-source-maps
import { logger, LogLevels } from "@akala/core";
import { cli } from "@akala/cli/cli";
import program, { buildCliContextFromProcess, ErrorMessage } from "@akala/cli";


const originalEmit = process.emit;
// @ts-expect-error - TS complains about the return type of originalEmit.apply
process.emit = function (name, data, ...args)
{
    if (
        name === `warning` &&
        typeof data === `object` &&
        data.name === `ExperimentalWarning` &&
        (data.message.includes(`Importing JSON modules`) || data.message.includes(`Import assertions`))
    )
        return false;

    return originalEmit.call(process, name, data, ...args);
};

const context = buildCliContextFromProcess(logger.use('akala', LogLevels.help), { plugins: [] });
cli();
await program.process(context).then(
    result =>
    {
        if (typeof result != 'undefined')
            console.log(result);
        process.exit(0);
    },
    err =>
    {
        if (err instanceof ErrorMessage)
            console.error(err.message);
        else if (err)
            console.error(err);
        else
            console.error('There is no such command. Try the --help flag to get help on usage');
        if (err && typeof err.statusCode != 'undefined')
        {
            if (Math.floor(err.statusCode / 100) > 3)
                process.exit(err.statusCode / 10);
            else
                process.exit(0);
        }
        else if (typeof process.exitCode != 'undefined')
            process.exit();
        else
            process.exit(50);
    });
