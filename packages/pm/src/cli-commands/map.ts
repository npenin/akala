import State, { SidecarMetadata } from '../state.js';
import { isAbsolute, resolve } from "path";

export default async function map<TName extends string>(this: State, name: TName, targetPath: string, runtime: SidecarMetadata['type'], cwd?: string, options?: { commandable?: boolean })
{
    if (!isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);
    this.config.containers.set(name, { type: runtime, path: targetPath, commandable: !!options?.commandable });
    await this.config.commit();
    return name
}
