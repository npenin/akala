import { promises as fs } from 'fs';
import path from 'path';
import glob from 'fast-glob';
import { builtinModules } from 'module';

async function checkDependencies(pattern: string[] | string = 'package.json')
{
    const packagePaths = await glob(pattern, { absolute: true });
    for (const packagePath of packagePaths)
    {
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
        const packageDir = path.dirname(packagePath);

        if (packageJson.workspaces)
            return checkDependencies(packageJson.workspaces.map(p => p + '/package.json'));

        const dependencies: Record<string, string> = { ...packageJson.dependencies, ...packageJson.devDependencies, ...packageJson.optionalDependencies, ...packageJson.peerDependencies };

        const usedModules: Record<string, string[]> = {};
        const files = await glob(['**/*.ts', '**/*.js'], { cwd: packageDir, absolute: true, ignore: ['node_modules/**'] });

        for (const file of files)
        {
            if ((await closestPackageJson(file, packagePaths)) !== packagePath)
                continue;
            const content = await fs.readFile(file, 'utf-8');
            const matches = content.match(/require\(['"]([^'"]+)['"]\)|(import\s+.*\s+from\s+['"]([^'"]+)['"])/g);
            if (matches)
            {
                matches.forEach(match =>
                {
                    const importPath = match.replace(/.*['"]([^'"]+)['"].*/, '$1').split('/');

                    let moduleName = importPath[0];
                    switch (moduleName[0])
                    {
                        case '.':
                            return;
                        case '@':
                            moduleName = importPath[0] + '/' + importPath[1];
                            break;
                        default:
                            if (match.startsWith('import type ') && !usedModules[moduleName])
                                moduleName = '@types/' + moduleName;
                    }

                    if (moduleName in usedModules)
                    {
                        if (!usedModules[moduleName].includes(file))
                            usedModules[moduleName].push(file);
                    }
                    else
                        usedModules[moduleName] = [file]

                });
            }
        }

        const missingDependencies = Object.entries(usedModules).filter(([module, _]) =>
            !dependencies[module] &&
            module !== packageJson.name &&
            (!module.startsWith('@types/') || !dependencies[module.substring('@types/'.length)]) &&
            !builtinModules.includes(module) &&
            !module.startsWith('node:'));
        if (missingDependencies.length > 0)
        {
            console.log(`Missing dependencies in ${packagePath}:`, missingDependencies.map(e => e[0]));
            console.log(Object.fromEntries(missingDependencies));
        }
    }
}

checkDependencies().catch(console.error);
async function closestPackageJson(file: string, packagePaths: string[])
{
    do
    {
        file = path.dirname(file);
    }
    while (!packagePaths.includes(file + '/package.json'));
    return file + '/package.json';
}

