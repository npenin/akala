import fsHandler from '@akala/fs';
import type State from '../state.js';
import type { SidecarMetadata } from '../state.js';
import { isAbsolute, resolve } from "path";
import { pathToFileURL } from 'url';
import { Metadata } from '@akala/commands';

export default async function map<TName extends string>(config: State['config'], name: TName, targetPath: string | URL, runtimeName: SidecarMetadata['type'], cwd?: string, options?: { commandable?: boolean })
{
    if (typeof targetPath == 'string' && !URL.canParse(targetPath) && !isAbsolute(targetPath))
        targetPath = resolve(cwd || process.cwd(), targetPath);

    let dependencies: string[];
    if (!!options?.commandable)
    {
        const url = targetPath instanceof URL ? targetPath : !URL.canParse(targetPath) ? pathToFileURL(targetPath) : new URL(targetPath);

        const fs = await fsHandler.process(url);

        const container = await fs.readFile<Metadata.Container>(url, { encoding: 'json' });

        if (container.dependencies)
            dependencies = container.dependencies;
    }

    config.containers.set(name, {
        type: runtimeName,
        path: targetPath.toString(),
        commandable: !!options?.commandable,
        dependencies
    });
    await config.commit();
    return name
}
