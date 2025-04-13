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
        serve: { urls: string[] };
    }
}
function plugin(config: AkalaConfig, program: NamespaceMiddleware<{ configFile: string }>)
{
    program.command('set-serve [...urls]').options({
        urls: {
            needsValue: true,
            default: [],
        },
        append: {
            default: false,
            aliases: ['a']
        }
    }).action(async context =>
    {
        switch (typeof context.options.urls)
        {
            case 'string':
                context.options.urls = [context.options.urls];
                break;
            case 'object':
                if (!Array.isArray(context.options.urls))
                    throw new Error('Invalid urls provided');
                break;
            case 'undefined':
                context.options.urls = config.serve.urls;
                if (!Array.isArray(context.options.urls))
                    throw new Error('Invalid urls provided');
                break;
            default:
                throw new Error('Invalid urls provided');
        }

        if ((context.options.urls).length == 0)
            throw new Error('No urls provided');

        config.serve = config.serve || { urls: [] };
        config.serve.urls = context.options.urls;
    });

    program.command('serve [...staticFolders]').options({
        'staticFolders': {
            needsValue: true,
            normalize: true,
            default: [fileURLToPath(new URL('../../views', import.meta.url))],
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

        await serve({ staticFolders: context.options.staticFolders as string[], urls: context.options.url as string[], signal: context.abort.signal });

        await new Promise((resolve) =>
        {
            context.abort.signal.addEventListener("abort", resolve);
        });
    });


}
