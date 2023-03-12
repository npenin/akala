import { NamespaceMiddleware } from './index.js';
import fs from 'fs/promises'

export default function (config, program: NamespaceMiddleware)
{
    const plugins = program.command('plugins');

    plugins.command('add <path>')
        .option<string>('path', { normalize: true })
        .action(async function (context)
        {
            const indexOfPath = config.plugins.indexOf(context.options.path);
            if (indexOfPath === -1)
            {
                config.plugins.push(context.options.path)
                const plugin = await import(context.options.path);
                if (plugin.install)
                    await plugin.install(context);
            }
            if (typeof context.state == 'object' && 'commit' in context.state && typeof context.state.commit == 'function')
                await context.state.commit();
            else
                await fs.writeFile(context.options.configFile, JSON.stringify(context.state, null, 4));
        })

    plugins.command('remove <path>')
        .option<string>('path', { normalize: true })
        .action(async function (context)
        {
            const indexOfPath = config.plugins.indexOf(context.options.path);
            if (indexOfPath === -1)
                throw new Error('There is no such registered plugin');
            config.plugins.splice(indexOfPath, 1);
            if (typeof context.state == 'object' && 'commit' in context.state && typeof context.state.commit == 'function')
                await context.state.commit();
            else
                await fs.writeFile(context.options.configFile, JSON.stringify(context.state, null, 4));
        })

    plugins.command('ls')
        .state<{ plugins: string[] }>()
        .action(async function (context)
        {
            return context.state.plugins;
        })
}