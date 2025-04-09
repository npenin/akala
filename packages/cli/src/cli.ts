import program, { CliContext, NamespaceMiddleware } from './router/index.js';
import fs from 'fs/promises'
// import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import * as akala from '@akala/core'
import { supportInteract } from './index.js';
import normalize from './helpers/normalize.js';

function isRoot(indexOfSep: number): boolean
{
    return path.sep == '\\' ? indexOfSep == 2 : indexOfSep == 0
}

export type AkalaConfig = { plugins: string[], commit?: () => Promise<void> };

export async function loadConfig(context: CliContext<{ configFile: string }, AkalaConfig>)
{

    let loadedConfig: AkalaConfig;

    if (context.options.configFile)
    {
        context.logger.info('loading config file from specified option flag');
        const stats = await fs.lstat(context.options.configFile);
        if (stats.isFile())
        {
            loadedConfig = JSON.parse(await fs.readFile(context.options.configFile, 'utf-8'));
            context.logger.debug('config file loaded')
        }
    }
    if (!loadedConfig)
    {
        context.logger.info('loading config file from current working directory and/or parents');
        const cwd = context.currentWorkingDirectory;

        let indexOfSlash = cwd.lastIndexOf(path.sep);
        let filePath: string = cwd;
        if (indexOfSlash !== cwd.length - 1)
        {
            indexOfSlash = cwd.length;
            filePath += path.sep;
        }
        do
        {
            try
            {
                filePath = path.join(filePath.substring(0, indexOfSlash), './.akala.json');
                context.options.configFile = filePath;
                loadedConfig = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                break;
            }
            catch (e)
            {
                if (e && e.code == 'ENOENT')
                {
                    indexOfSlash = filePath.lastIndexOf(path.sep, indexOfSlash - 1);
                    continue;
                }
                throw e;
            }
        }
        while (!loadedConfig && !isRoot(indexOfSlash))

        if (!loadedConfig)
        {
            context.logger.debug('config not found, setting configFile path to cwd');
            context.logger.debug('cwd is ', cwd);

            context.options.configFile = path.join(cwd, '/.akala.json');
        }
    }

    if (loadedConfig)
    {
        context.logger.debug('config loaded from ' + context.options.configFile);
        context.state = loadedConfig;
        if (!('commit' in context.state && typeof context.state.commit === 'function'))
            context.state.commit = () => fs.writeFile(context.options.configFile, JSON.stringify(context.state, null, 4));
        plugins.push(...loadedConfig.plugins)
    }
    return loadedConfig;
}

export async function loadPlugins(context: CliContext<{ configFile: string }, AkalaConfig>, mainProgram: NamespaceMiddleware<{ help: boolean }>, plugins: string[])
{

    if (plugins)
    {
        context.logger.debug(`loading plugins...`);
        await akala.eachAsync(plugins, async function (plugin)
        {
            context.logger.silly(`loading ${plugin}...`);
            let packageName: string;
            try
            {
                packageName = normalize({ mode: 'import', relativeTo: path.dirname(context.options.configFile) }, context.currentWorkingDirectory, plugin);
            }
            catch (e)
            {
                packageName = plugin;
            }
            (await import(packageName)).default(context.state, mainProgram, context);
        });
        context.logger.debug(`plugins loaded`);
    }
    else
        context.logger.info(`no plugin to load ? odd...`);
}

const plugins = [new URL('./helpers/repl.js', import.meta.url).toString(), new URL('./plugins.js', import.meta.url).toString(), new URL('./install.mjs', import.meta.url).toString()];

export function cli()
{
    const mainProgram = program.command(null).option<boolean, 'help'>('help', { needsValue: false });
    program.useError(supportInteract(mainProgram))
    program.option('verbose', {
        aliases: ['v'],
        needsValue: false,
        default: akala.LogLevels.help as akala.LogLevels
    }).preAction(async context => { context.logger.level = context.options.verbose });
    program.
        option('configFile', { aliases: ['c', 'config-file'], needsValue: true, default: '' as string }).
        state<AkalaConfig>().
        preAction(async context =>
        {
            await loadConfig(context);
        }).
        preAction(async (context) =>
        {
            await loadPlugins(context, mainProgram, plugins);
        })

    program.option('help', { needsValue: false });

    return mainProgram.state<AkalaConfig>();
};
