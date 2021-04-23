import State from "../state";
import { isAbsolute, resolve } from "path";
import { serveMetadata } from "@akala/commands";

export default async function map<TName extends string>(this: State, name: TName, targetPath: string, cwd?: string, commandable?: boolean): Promise<State['config']['mapping'][TName]>
{
    if (!isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);
    this.config.mapping[name] = { path: targetPath, commandable: !!commandable, connect: serveMetadata(name, { options: {}, args: ['local'] }) };
    await this.config.save();
    return this.config.mapping[name]
}