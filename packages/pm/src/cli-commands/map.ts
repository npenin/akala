import State, { SidecarMetadata } from '../state.js';
import { isAbsolute, resolve } from "path";

export default async function map<TName extends string>(this: State, name: TName, targetPath: string | URL, runtime: SidecarMetadata['type'], cwd?: string, options?: { commandable?: boolean })
{
    if (typeof targetPath == 'string' && !URL.canParse(targetPath) && !isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);
    this.config.containers.set(name, { type: runtime, path: targetPath.toString(), commandable: !!options?.commandable });
    await this.config.commit();
    return name
}
