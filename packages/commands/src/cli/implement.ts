import { CliContext } from "@akala/cli";
import { readFile, mkdir } from "fs/promises";
import { join } from "path";
import { Container } from "../metadata";
import _new, { newCommandConfiguration } from "./new";

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
        await _new('c', c.name, options, join(destination, metadata.name));
        await newCommandConfiguration(c, options, join(destination, metadata.name));
    }
    ));
}