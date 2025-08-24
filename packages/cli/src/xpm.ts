import { NamespaceMiddleware } from './index.js';
import { pathToFileURL } from 'url';
import yarnHelper, { hasYarn } from './xpm/yarn-helper.js';
import npmHelper from './xpm/npm-helper.js';
import { ErrorWithStatus, HttpStatusCode, packagejson } from '@akala/core';
import pnpmHelper from './xpm/pnpm-helper.js';
import apmHelper from './xpm/apm-helper.js';

interface Package
{
    name: string;
    version: string;
    packageManager?: string;
    exports?: object;
}

export async function xpm(cwd: string): Promise<{
    name: string;
    setup(path?: string, options?: {
        production?: boolean;
    }): Promise<void>;
    install(packageName: string, path?: string): Promise<void>;
    uninstall(packageName: string, path?: string): Promise<void>;
    update(packageName: string, path?: string): Promise<void>;
    link(packageName: string, path?: string): Promise<void>;
    info(packageName: string, path?: string): Promise<packagejson.CoreProperties>;
}>
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
        case 'pnpm':
            return pnpmHelper;
        case 'apm':
            return apmHelper;
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
