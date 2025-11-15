import program, { type CliContext, NamespaceMiddleware } from './router/index.js';
// import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import * as akala from '@akala/core'
import { supportInteract } from './index.js';
import normalize from './helpers/normalize.js';
import fsHandler, { FileSystemProvider, readFile, writeFile } from '@akala/fs';
import { pathToFileURL } from 'url';

function isRootFileUrl(url: URL)
{
    // Linux/macOS root
    if (url.pathname === '/') return true;

    // Windows root: must be like /C:/
    const windowsRootPattern = /^\/[a-zA-Z]:\/$/;
    if (windowsRootPattern.test(url.pathname)) return true;

    return false;
}

export interface AkalaConfig
{
    plugins: string[],
    commit?: () => Promise<void>
}

export type Plugin = (config: AkalaConfig, program: NamespaceMiddleware<{ help: boolean, configFile: string }>, context: CliContext<{ configFile: string }, AkalaConfig>) => Promise<void> | void;


export async function loadConfig(context: CliContext<{ configFile: string }, AkalaConfig>)
{
    let loadedConfig: AkalaConfig;

    if (context.options.configFile)
    {
        context.logger.info(`loading config file from specified option flag (${context.options.configFile})`);
        try
        {
            loadedConfig = await readFile(context.options.configFile, 'json');
            context.logger.debug('config file loaded')
        }
        catch (e)
        {
            if (e.statusCode !== 404)
                throw e;
        }
    }
    else 
    {
        context.logger.info('loading config file from current working directory and/or parents');
        const cwd = pathToFileURL(context.currentWorkingDirectory?.endsWith(path.sep) ? context.currentWorkingDirectory : context.currentWorkingDirectory + path.sep);

        let indexOfSlash = cwd.pathname.lastIndexOf(path.sep);
        let filePath = cwd;
        if (indexOfSlash !== cwd.pathname.length - 1)
        {
            indexOfSlash = cwd.pathname.length;
            filePath = new URL('./', filePath);
        }

        let prefix = '';

        let fs: FileSystemProvider;

        do
        {
            fs = await fsHandler.process(new URL(prefix, filePath));
            try
            {
                loadedConfig = await fs.readFile('./.akala.json', { encoding: 'json' });
                context.options.configFile = new URL('./.akala.json', fs.root).toString();
                break;
            }
            catch (e)
            {
                if (e && e.statusCode == 404)
                {
                    prefix += '../'
                    continue;
                }
                throw e;
            }
        }
        while (!loadedConfig && !isRootFileUrl(fs.root))

        if (!loadedConfig)
        {
            context.logger.debug('config not found, setting configFile path to cwd');
            context.logger.debug('cwd is ' + cwd);

            context.options.configFile = new URL('/.akala.json', cwd).toString();
        }
    }

    if (loadedConfig)
    {
        context.logger.debug('config loaded from ' + context.options.configFile);
        context.state = loadedConfig;
        if (!('commit' in context.state && typeof context.state.commit === 'function'))
            context.state.commit = () => writeFile(context.options.configFile, JSON.stringify(context.state, null, 4), 'utf-8');
        plugins.push(...loadedConfig.plugins)
    }
    return loadedConfig;
}

export async function loadPlugins(context: CliContext<{ configFile: string }, AkalaConfig>, mainProgram: NamespaceMiddleware<{ help: boolean, configFile: string }>, plugins: string[])
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
            ((await import(packageName)).default as Plugin)(context.state, mainProgram, context);
        });
        context.logger.debug(`plugins loaded`);
    }
    else
        context.logger.info(`no plugin to load ? odd...`);
}

const plugins = [new URL('./helpers/repl.js', import.meta.url).toString(), new URL('./plugins.js', import.meta.url).toString(), new URL('./install.mjs', import.meta.url).toString()];

export function cli()
{
    program.preAction(async c => akala.setDefaultContext(c));
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
            await loadPlugins(context, mainProgram as NamespaceMiddleware<{ help: true, configFile: string }>, plugins);
        })

    program.option('help', { needsValue: false });

    return mainProgram.state<AkalaConfig>();
};
