import { NamespaceMiddleware } from './index.js';
import { pathToFileURL } from 'url';
import yarnHelper, { hasYarn } from './yarn-helper.js';
import npmHelper from './npm-helper.js';
import { ErrorWithStatus, HttpStatusCode } from '@akala/core';

interface Package
{
    name: string;
    version: string;
    packageManager?: string;
    exports?: object;
}

export async function xpm(cwd: string)
{
    const pkg = (await import(new URL('./package.json', pathToFileURL(cwd) + '/').toString(), { with: { type: 'json' } })).default as Package;
    let pkgManager: string;
    if (pkg.packageManager)
    {
        const pkgManagerSpec = pkg.packageManager.split('@');
        pkgManager = pkgManagerSpec[0];
    }
    else
    {
        if (await hasYarn(cwd))
            pkgManager = 'yarn';
        else
            pkgManager = 'npm';
    }

    switch (pkgManager)
    {
        case 'yarn':
            return yarnHelper;
        case 'npm':
            return npmHelper;
        default:
            throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'Unfortunately your package manager is not (yet) supported');
    }
};

export default function (config, program: NamespaceMiddleware<{ configFile: string }>)
{
    const plugins = program.command('xpm');

    plugins.command('add <package>')
        .option<string>()('package', {})
        .action(async function (context)
        {
            await (await xpm(context.currentWorkingDirectory)).install(context.args[0]);
        });

    plugins.command('remove <package>')
        .option<string>()('path', { normalize: true })
        .action(async function (context)
        {
            await (await xpm(context.currentWorkingDirectory)).uninstall(context.args[0]);
        });
}
