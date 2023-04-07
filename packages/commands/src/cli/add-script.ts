import * as fs from 'fs/promises';
import * as path from 'path'

const scopedRE = /^(@[^/]+\/).+$/

export default async function addScript(name?: string, folder?: string, metadataFile?: string, typescriptFile?: string)
{
    folder = folder || '';

    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    //eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = (await import(path.join(process.cwd(), './package.json'), { assert: { type: 'json' } })).default;

    if (!metadataFile)
        metadataFile = 'commands.json';

    if (name)
        name = name.replace(scopedRE, '');

    if (!pkg.scripts)
        pkg.scripts = {};

    let scriptNames: [string, string];
    if (name)
        scriptNames = ['generate-' + name, 'generate-metadata-' + name];
    else
        scriptNames = ['generate', 'generate-metadata'];

    if (pkg.scripts[scriptNames[0]])
        console.warn(`Warn: There is already a script named ${scriptNames[0]}. Overwriting...`)

    if (pkg.scripts[scriptNames[1]])
        console.warn(`Warn: There is already a script named ${scriptNames[1]}. Overwriting...`)

    pkg.scripts[scriptNames[0]] = `ac generate ${folder} ${metadataFile} --name ${name || pkg.name}`;
    if (typescriptFile)
    {
        pkg.scripts[scriptNames[1]] = `ac generate-metadata ${metadataFile} ${typescriptFile}`;
        if (name)
            pkg.scripts[scriptNames[1]] += ` --name ${name}`;
    }

    await fs.writeFile(path.join(process.cwd(), './package.json'), JSON.stringify(pkg, null, 4));
}