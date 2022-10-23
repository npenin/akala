import State from '../state';
import { isAbsolute, resolve } from "path";

export default async function map<TName extends string>(this: State, name: TName, targetPath: string, cwd?: string, options?: { commandable?: boolean, stateless?: boolean }): Promise<State['config']['mapping'][TName]>
{
    if (!isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);
    this.config.containers.set(name, { path: targetPath, commandable: !!options?.commandable, stateless: !!options?.stateless });
    await this.config.commit();
    return this.config.mapping[name]
}