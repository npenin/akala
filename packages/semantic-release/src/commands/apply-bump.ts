import { CliContext } from "@akala/cli";
import { Levels } from "./recommend-bump.js";
import semver from 'semver'
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

type Workspace = { location: string, version: string, name: string, workspaceDependencies: string[], bump: keyof typeof Levels };



export default async function (this: CliContext, workspace: Workspace)
{
    const version = semver.coerce(workspace.version);
    if (workspace.bump != 'decline')
        version[workspace.bump]++;

    const path = workspace.location;
    const pkg = JSON.parse(await readFile(resolve(path, './package.json'), 'utf-8'));
    pkg.version = version.format();
    await writeFile(resolve(path, './package.json'), JSON.stringify(pkg, null, 4), 'utf-8');

}
