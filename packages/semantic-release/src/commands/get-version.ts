import { readFile } from "fs/promises";
import { resolve } from "path";

export default async function (path: string)
{
    const pkg = JSON.parse(await readFile(resolve(path, './package.json'), 'utf-8'));
    return pkg.version;
}