import { readFile } from "fs/promises";
import { resolve } from "path";

export default async function getVersion(workspace: string): Promise<string>
export default async function getVersion(workspace: { location: string, name: string }): Promise<{ location: string, name: string, version: string }>
export default async function getVersion(workspace: string | { location: string, name: string })
{
    if (typeof workspace !== 'string')
        return Object.assign(workspace, { version: await getVersion(workspace.location) });
    const path = workspace;
    const pkg = JSON.parse(await readFile(resolve(path, './package.json'), 'utf-8'));
    return pkg.version;
}