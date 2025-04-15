import glob from "fast-glob"
import { promises as fs } from 'fs'

const map = {
    'json-rpc-ws': '_jsonrpc'
}

export default async function ()
{
    const packagePaths = await glob('packages/*/package.json');
    const packageJsons = await Promise.all(packagePaths.map(async packagePath => JSON.parse(await fs.readFile(packagePath, 'utf8')) as { name: string, dependencies: Record<string, string>, devDependencies: Record<string, string>, optionalDependencies: Record<string, string>, private?: boolean }));

    const chart = packageJsons.filter(p => !p.private && p.name.startsWith('@akala/')).map(p => [
        p.name.substring('@akala/'.length),
        Object.keys(p.dependencies || {}).filter(p => p.startsWith('@akala/')).map(p => p.substring('@akala/'.length)),
        Object.keys(p.optionalDependencies || {}).filter(p => p.startsWith('@akala/')).map(p => p.substring('@akala/'.length)),
    ] as const);

    return '```mermaid\n' +
        `%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TB
    ${chart.filter(e => e[1].length).map(e => e[0] + ' ---> ' + e[1].join(' & ')).join('\n   ')}
    ${chart.filter(e => e[2].length).map(e => e[0] + ' -.-> ' + e[2].join(' & ')).join('\n   ')}

    ${chart.map(e => `click ${e[0]} "${map[e[0]] || '_' + e[0]}" "Go to ${e[0]} documentation"`).join('\n   ')}
`+
        '```'
}
