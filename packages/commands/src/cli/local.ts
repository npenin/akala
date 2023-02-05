import { Logger } from "@akala/core";
import { Cli } from "../index.js";

export default async function local(logger: Logger, path: string, args: string[])
{
    const cli = await Cli.fromFileSystem(path);
    cli.program.useError(async (e, c) =>
    {
        if (c.options.verbose)
            console.error(e);
        else
            console.error(e['message'] || e);
    });
    await cli.start(logger, args);
}