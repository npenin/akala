import { readFile, mkdir } from "fs/promises";
import { join } from "path";
import { Container } from "../metadata";
import _new from "./new";

export default async function implement(pathToCommandFile: string, destination: string): Promise<void>
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
        await _new('c', c.name, null, join(destination, metadata.name));
        await _new('cc', c.name, null, join(destination, metadata.name));
    }
    ));
}