import { type CliContext } from "@akala/cli";
import { mkdir } from "fs/promises";
import { join } from "path";
import { type Container } from "../metadata/index.js";
import command from "./new/command.js";
import { newCommandConfiguration } from "./new/command-config.js";
import fsHandler from "@akala/fs";

export default async function implement(pathToCommandFile: string, destination: string, options: CliContext<{ force?: boolean }>['options']): Promise<void>
{
    if (!URL.canParse(pathToCommandFile))
        pathToCommandFile = 'file:' + pathToCommandFile;
    const sourceFs = await fsHandler.process(new URL(pathToCommandFile))
    var metadata = await sourceFs.readFile<Container>(new URL(pathToCommandFile), { encoding: 'json' });
    try
    {
        await mkdir(join(destination, metadata.name), { recursive: true });
    }
    catch (e)
    {
        if (e.code !== 'EEXIST')
            throw e;
    }
    await Promise.all(metadata.commands.map(async c =>
    {
        if (!c.config)
            c.config = {};
        var paramConfig: { name: string, type?: string }[] = c.config["types"] && c.config["types"].inject && c.config["types"].inject.map((a, i) => ({ name: a, type: c.config["types"].types && c.config["types"].types[i] }));
        if (!paramConfig)
            paramConfig = Array.isArray(c.config?.[""]?.inject) ? c.config[""].inject.map((p, i) => ({ name: typeof p == 'string' && p.replace(/\./g, '') || 'arg' + i })) : [];

        await command(c.name, options, join(destination, metadata.name), paramConfig);
        if (!c.config.fs)
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.config.fs = { inject: c.config[""]?.inject || [] } as any;
        c.config.fs.path = join(destination, metadata.name, c.name + '.ts');
        c.config.fs.source = join(destination, metadata.name, c.name + '.ts');
        await newCommandConfiguration(c, options, join(destination, metadata.name));
    }
    ));
}
