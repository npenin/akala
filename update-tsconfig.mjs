import fs from 'fs/promises'
import path from 'path'

const exportOrder = ['types', 'node', 'import', 'require', 'default'];

async function x(type, tsconfigPath, packageConfig)
{
    const config = (await import(tsconfigPath, { assert: { type: 'json' } })).default;
    config.compilerOptions.outDir = "dist/" + type;
    if (config.extends !== `../tsconfig.settings.${type}.json`)
        config.extends = `../tsconfig.settings.${type}.json`;

    if (config.references)
        config.references = config.references.map(ref => ref.path.endsWith(type + '.json') ? ref : { path: `${ref.path}/tsconfig.${type}.json` });

    await fs.writeFile(tsconfigPath, JSON.stringify(config, null, 4));

    const pkg = (await import(packageConfig, { assert: { type: 'json' } })).default;
    if (!pkg.exports)
        pkg.exports = { ".": {} };
    if (!pkg.exports['.'])
        pkg.exports['.'] = {};
    switch (type)
    {
        case 'cjs':
            pkg.exports['.'].require = pkg.main;
            pkg.main = pkg.exports['.'].node = pkg.exports['.'].require;
            pkg.types = pkg.main.replace(/\.js$/, '.d.ts')
            break;
        case 'esm':
            if (pkg.main)
                pkg.module = pkg.main.replace('/cjs', '/esm');
            pkg.exports['.'].import = `./dist/${type}/index.js`
            pkg.exports['.'].types = pkg.exports['.'].import.replace(/\.js/, '.d.ts');
            break;
        default:
            throw new Error('Not supported type ' + type);
    }
    pkg.exports['.'].default = pkg.exports['.'].require;
    // if (pkg.types && !pkg.exports['.'].types)
    pkg.exports['.'] = Object.fromEntries(exportOrder.map(k => [k, pkg.exports['.'][k]]));

    await fs.writeFile(packageConfig, JSON.stringify(pkg, null, 4));
}

const cjs = await import('./packages/tsconfig.cjs.json', { assert: { type: 'json' } });
for (var ref of cjs.default.references)
{
    const tsconfigPath = path.join(path.dirname(import.meta.url).substring(5), './packages', ref.path);
    const packageConfig = path.join(path.dirname(path.join(path.dirname(import.meta.url).substring(5), './packages', ref.path)), './package.json');
    try
    {
        await x('cjs', tsconfigPath, packageConfig);
    }
    catch (e)
    {
        if (e instanceof SyntaxError)
        {
            console.error(e);
            break;
        }
        await fs.copyFile(tsconfigPath.replace('.cjs', ''), tsconfigPath);
        await x('cjs', tsconfigPath, packageConfig);
    }
}


const esm = await import('./packages/tsconfig.esm.json', { assert: { type: 'json' } });
for (var ref of esm.default.references)
{
    const tsconfigPath = path.join(path.dirname(import.meta.url).substring(5), './packages', ref.path);
    const packageConfig = path.join(path.dirname(path.join(path.dirname(import.meta.url).substring(5), './packages', ref.path)), './package.json');
    try
    {
        await x('esm', tsconfigPath, packageConfig);
    }
    catch (e)
    {
        if (e instanceof SyntaxError)
        {
            console.error(e);
            break;
        }
        await fs.copyFile(tsconfigPath.replace('.esm', ''), tsconfigPath);
        await x('esm', tsconfigPath, packageConfig);
    }
}