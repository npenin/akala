import { NamespaceMiddleware } from './index.js';
import { pathToFileURL } from 'url';
import yarnHelper from './yarn-helper.js';
import npmHelper from './npm-helper.js';
import { ErrorWithStatus, HttpStatusCode } from '@akala/core';

interface Package
{
    name: string;
    version: string;
    packageManager?: string;
    exports?: object;
}

export default function (config, program: NamespaceMiddleware<{ configFile: string }>)
{
    const plugins = program.command('xpm');

    plugins.command('add <package>')
        .option<string>()('package', {})
        .action(async function (context)
        {
            const pkg = (await import(new URL('./package.json', pathToFileURL(context.currentWorkingDirectory)).toString(), { with: { type: 'json' } })).default as Package;
            let pkgManager: string;
            if (pkg.packageManager)
            {
                const pkgManagerSpec = pkg.packageManager.split('@');
                pkgManager = pkgManagerSpec[0];
            }
            else
                pkgManager = 'npm';

            switch (pkgManager)
            {
                case 'yarn':
                    await yarnHelper.install(context.args[0]);
                case 'npm':
                    await npmHelper.install(context.args[0]);
                default:
                    throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'Unfortunately your package manager is not (yet) supported');
            }
        });

    plugins.command('remove <package>')
        .option<string>()('path', { normalize: true })
        .action(async function (context)
        {
            const pkg = (await import(new URL('./package.json', pathToFileURL(context.currentWorkingDirectory)).toString(), { with: { type: 'json' } })).default as Package;
            let pkgManager: string;
            if (pkg.packageManager)
            {
                const pkgManagerSpec = pkg.packageManager.split('@');
                pkgManager = pkgManagerSpec[0];
            }
            else
                pkgManager = 'npm';

            switch (pkgManager)
            {
                case 'yarn':
                    await yarnHelper.uninstall(context.args[0]);
                case 'npm':
                    await npmHelper.uninstall(context.args[0]);
                default:
                    throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'Unfortunately your package manager is not (yet) supported');
            }
        });

    plugins.command('ls')
        .state<{ plugins: string[] }>()
        .action(async function (context)
        {
            return context.state.plugins;
        });
}