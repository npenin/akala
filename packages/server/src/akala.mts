import { NamespaceMiddleware } from '@akala/cli';
import { AkalaConfig, Plugin } from '@akala/cli/cli'
import { serve } from './index.js';
import { fileURLToPath } from 'url';

const x: Plugin = plugin;
export default x;

declare module '@akala/cli/cli'
{
    interface AkalaConfig
    {
        serve: { urls: string[], staticFolders: string[] };
    }
}
function plugin(config: AkalaConfig, program: NamespaceMiddleware<{ configFile: string }>)
{
    program.command('serve [...staticFolders]').options({
        'staticFolders': {
            needsValue: true,
            normalize: true,
            default: ['.', fileURLToPath(new URL('../../views', import.meta.url))],
        },
        set: {
            needsValue: false
        },
        append: {
            needsValue: false
        },
        'url': {
            needsValue: true,
            default: []
        }
    }).action(async context =>
    {
        if (typeof context.options.url == 'string')
            context.options.url = [context.options.url];
        if (typeof context.options.staticFolders == 'string')
            context.options.staticFolders = [context.options.staticFolders];

        if (context.options.append)
        {
            context.options.url = [].concat(config.serve.urls || [], context.options.url);
            context.options.staticFolders = [].concat(config.serve.staticFolders || [], context.options.staticFolders);
        }
        if (context.options.set)
        {
            config.serve.urls = context.options.url as string[];
            config.serve.staticFolders = context.options.staticFolders as string[];
            await config.commit();
        }
        else
            await serve({ staticFolders: context.options.staticFolders as string[], urls: context.options.url as string[], signal: context.abort.signal });

        await new Promise((resolve) =>
        {
            context.abort.signal.addEventListener("abort", resolve);
        });
    });


}
