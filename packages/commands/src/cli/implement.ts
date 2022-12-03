import { CliContext } from "@akala/cli";
import { readFile, mkdir } from "fs/promises";
import { join } from "path";
import { Container } from "../metadata";
import command from "./new/command";
import { newCommandConfiguration } from "./new/command-config";

export default async function implement(pathToCommandFile: string, destination: string, options: CliContext<{ force?: boolean }>['options']): Promise<void>
{
    var metadata: Container = JSON.parse(await readFile(pathToCommandFile, 'utf-8'));
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
            paramConfig = c.config[""] && c.config[""].inject && c.config[""].inject?.map(p => ({ name: p.replace(/\./g, '') }));

        await command(c.name, options, join(destination, metadata.name), paramConfig);
        if (!c.config.fs)
            c.config.fs = { inject: c.config[""]?.inject || [] } as any;
        c.config.fs.path = join(destination, metadata.name, c.name + '.ts');
        c.config.fs.source = join(destination, metadata.name, c.name + '.ts');
        await newCommandConfiguration(c, options, join(destination, metadata.name));
    }
    ));
}