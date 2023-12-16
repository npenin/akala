import { readFile } from "fs/promises";
import { resolve } from "path";

export default async function (workspaces: { name: string, location: string }[])
{
    return Promise.all(workspaces.map(async workspace =>
    {
        const pkg = JSON.parse(await readFile(resolve(workspace.location, './package.json'), 'utf-8'));
        console.log(pkg)
        return Object.assign(workspace, { private: pkg.private });
    })).then(workspaces => workspaces.filter(w => !w.private));
}