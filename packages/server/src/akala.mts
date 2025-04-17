import { NamespaceMiddleware } from '@akala/cli';
import { AkalaConfig, Plugin } from '@akala/cli/cli'
import { serve, trigger } from './index.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { ErrorWithStatus } from '@akala/core';
import { containers } from '@akala/commands/akala';
import { Container, protocolHandlers, registerCommands, serverHandlers } from '@akala/commands';

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
        api: {
            needsValue: true
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
            config.serve = config.serve || { urls: [], staticFolders: [] };
            config.serve.urls = context.options.url as string[];
            config.serve.staticFolders = context.options.staticFolders as string[];
            await config.commit();
            return;
        }
        if (!context.options.append)
        {
            if (context.options.url)
                context.options.url = config.serve.urls;
            if (context.options.staticFolders)
                context.options.staticFolders = config.serve.staticFolders;
        }
        const router = await serve({ staticFolders: context.options.staticFolders as string[], urls: context.options.url as string[], signal: context.abort.signal });
        if (context.options.api)
        {
            if (typeof context.options.api !== 'string')
                throw new ErrorWithStatus(400, 'Bad Api format provided');

            let containerName: string = context.options.api;
            const indexOfAt = containerName.indexOf('@');
            let listenUrls: string[] = context.options.url as string[];
            if (~indexOfAt)
            {
                containerName = containerName.substring(0, indexOfAt);
                listenUrls = context.options.api.substring(indexOfAt + 1).split(',');
            }

            let container = containers.resolve<Container<unknown>>(containerName);
            if (!container)
            {
                if (!URL.canParse(containerName))
                {
                    const result = await protocolHandlers.process(new URL(containerName, pathToFileURL(context.currentWorkingDirectory) + '/'), { signal: context.abort.signal }, {});
                    const metaContainer = await result.getMetadata();
                    container = new Container(metaContainer.name, {})
                    registerCommands(metaContainer.commands, result.processor, container);
                }
            }

            if (container)
            {
                await Promise.all(listenUrls.filter(url => !(context.options.url as string | string[]).includes(url)).map(url => serverHandlers.process(new URL(url), container, { signal: context.abort.signal })));
                const alreadyListeningUrls = listenUrls.filter(url => (context.options.url as string | string[]).includes(url));
                if (alreadyListeningUrls.length)
                    container.attach(trigger, router)
            }
            else
                console.warn(`The container ${containerName} could not be found`);
        }

        await new Promise((resolve) =>
        {
            context.abort.signal.addEventListener("abort", resolve);
        });
    });


}
