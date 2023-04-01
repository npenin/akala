#!/usr/bin/env node
import program, { ErrorMessage } from './router/index.js';
import fs from 'fs/promises'
import path from 'path'
import * as akala from '@akala/core'
import { buildCliContextFromProcess } from './index.js';

function isRoot(indexOfSep: number): boolean
{
    return path.sep == '\\' ? indexOfSep == 2 : indexOfSep == 0
}


const originalEmit = process.emit;
// @ts-expect-error - TS complains about the return type of originalEmit.apply
process.emit = function (name, data, ...args)
{
    if (
        name === `warning` &&
        typeof data === `object` &&
        data.name === `ExperimentalWarning` &&
        (data.message.includes(`Importing JSON modules`))
    )
        return false;

    return originalEmit.call(process, name, data, ...args);
};

(async function ()
{
    const mainProgram = program.command(null).option('help');
    const plugins = ['./helpers/repl.js', './plugins.js'];
    const config: { plugins: string[], commit?: () => Promise<void> } = { plugins: [] };
    let loadedConfig: { plugins: string[] };
    program.option<string>('configFile', { aliases: ['c', 'config-file'], needsValue: true }).preAction(async context =>
    {
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
            const cwd = process.cwd();

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
                context.options.configFile = path.join(cwd, '/.akala.json');
            }
        }

        if (loadedConfig)
        {
            context.logger.debug('config loaded from ' + context.options.configFile);
            context.state = loadedConfig;
            plugins.push(...loadedConfig.plugins)
        }
    }).
        state<typeof config>().
        preAction(async (context) =>
        {
            if (plugins)
            {
                context.logger.debug(`loading plugins...`);
                await akala.eachAsync(plugins, async function (plugin)
                {
                    context.logger.silly(`loading ${plugin}...`);
                    (await import(plugin)).default(context.state, mainProgram);
                });
                context.logger.debug(`plugins loaded`);
            }
            else
                context.logger.info(`no plugin to load ? odd...`);
            if (!('commit' in context.state && typeof context.state.commit === 'function'))
                context.state.commit = () => fs.writeFile(context.options.configFile, JSON.stringify(context.state));
        })


    program.option('help', { needsValue: false }).process(buildCliContextFromProcess(undefined, config)).then(
        result =>
        {
            if (typeof result != 'undefined')
                console.log(result)
        },
        err =>
        {
            if (err instanceof ErrorMessage)
                console.error(err.message);
            else if (err)
                console.error(err);
            else
                console.error('There is no such command. Try the --help flag to get help on usage');
            if (err && err.statusCode)
                process.exit(err.statusCode);
            else
                process.exit(500);
        });
})();