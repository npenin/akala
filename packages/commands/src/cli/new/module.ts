import { CliContext } from "@akala/cli";
import { outputHelper, write } from "../new";
import fs from 'fs/promises'
import path from "path";

type File = { name: string, content?: string };
type Folder = { name: string, children: (File | Folder)[] };

export async function mkHierarchy(destination: string, hierarchy: (File | Folder)[])
{
    await fs.mkdir(destination);
    await Promise.all(hierarchy.map(i =>
    {
        if ('children' in i)
            return mkHierarchy(path.join(destination, i.name), i.children);
        else
            return fs.writeFile(path.join(destination, i.name), i.content);
    }));
}

export default async function (name: string, context: CliContext<{ force?: boolean }>, destination?: string)
{
    var hierarchy = [{
        name: 'src',
        children: [
            { name: 'index.ts', context: '' }
        ],

    }, {
        name: '.gitignore', content: `.nyc_output
    node_modules
    dist
    coverage
    yarn-error.log
    *._ts`},
    {
        name: '.npmignore', content: `.!dist
    test`},
    {
        name: 'package.json', content: JSON.stringify({
            "name": name,
            "version": "0.0.0",
            "main": "dist/index.js",
            "types": "dist/index.d.ts",
            "scripts": {
                "test": "echo \"Error: no test specified\""
            },
        }, null, 4)
    },
    {
        name: 'tsconfig.json', content: JSON.stringify({
            "extends": "../tsconfig.settings.json",
            "compileOnSave": true,
            "compilerOptions": {
                "rootDir": "src",
                "outDir": "dist"
            },
            "references": []
        })
    }];

    await mkHierarchy(destination, hierarchy);
}