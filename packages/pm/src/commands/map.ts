import State from "../state";
import { join, isAbsolute, resolve } from "path";
import { serveMetadata } from "@akala/commands";

export default async function map(this: State, name: string, targetPath: string, cwd?: string, commandable?: boolean)
{
    if (!isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);
    this.config.mapping[name] = { path: targetPath, commandable: !!commandable, connect: serveMetadata(name, { _: ['local'] }) };
    await this.config.save();
    return { [name]: this.config.mapping[name] }
};