import { NamespaceMiddleware } from '@akala/cli';
import type { AkalaConfig, Plugin } from '@akala/cli/cli'
import { serve, trigger } from './index.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { ErrorWithStatus } from '@akala/core';
import { containers, InitAkala } from '@akala/commands/akala';
import { Container, protocolHandlers, registerCommands, serverHandlers } from '@akala/commands';
import { dirname, relative } from 'path';
import './handlers.js'

const x: Plugin = plugin;
export default x;

declare module '@akala/cli/cli'
{
    interface AkalaConfig
    {
        serve: { urls: string[], staticFolders: string[], api: string[] };
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

        let urls = (context.options.url as string[]).map(url => new URL(url));
        if (context.options.append)
        {
            context.options.url = [].concat(config.serve.urls || [], context.options.url);
            context.options.staticFolders = [].concat(config.serve.staticFolders || [], context.options.staticFolders);
        }
        else if (!context.options.set)
        {
            if (!(context.options.url as string[]).length)
                urls = config.serve.urls.map(url => new URL(url));
            if (!context.options.staticFolders)
                context.options.staticFolders = config.serve.staticFolders;
            if (!context.options.api)
                context.options.api = config.serve.api;
        }
        if (context.options.set)
        {
            config.serve = config.serve || { urls: [], staticFolders: [], api: [] };
            config.serve.urls = urls.map(url => url.toString());
            config.serve.api = context.options.api as string[];
            config.serve.staticFolders = (context.options.staticFolders as string[]).map(folder => './' + relative(dirname(context.options.configFile), folder));
            await config.commit();
            return;
        }

        const router = await serve({ staticFolders: context.options.staticFolders as string[], urls: urls, signal: context.abort.signal, fallthrough: true });
        if (context.options.api)
        {
            if (typeof context.options.api !== 'string')
                throw new ErrorWithStatus(400, 'Bad Api format provided');

            let containerName: string = context.options.api;
            const indexOfAt = containerName.indexOf('@', 1);
            let listenUrls = urls;
            if (~indexOfAt)
            {
                containerName = containerName.substring(0, indexOfAt);
                listenUrls = context.options.api.substring(indexOfAt + 1).split(',').map(url => new URL(url));
            }

            let container = containers.resolve<Container<unknown>>(containerName);
            if (!container)
            {
                if (!URL.canParse(containerName))
                {
                    const result = await protocolHandlers.process(new URL(containerName, pathToFileURL(context.currentWorkingDirectory) + '/'), { signal: context.abort.signal }, {});
                    const metaContainer = await result.getMetadata();
                    container = new Container(metaContainer.name, {});
                    container.processor.useMiddleware(4, new InitAkala(undefined, { config: context.state, _trigger: 'server', router }))
                    registerCommands(metaContainer.commands, result.processor, container);
                    if (metaContainer.commands.find(c => c.name == '$init'))
                        await container.dispatch('$init', { params: [], _trigger: 'server', config: context.state, router });
                }
            }

            if (container)
            {
                const alreadyListeningUrls = listenUrls.filter(url =>
                {
                    return urls.some(listenUrl => listenUrl.toString() == new URL("/", url).toString());
                });
                await Promise.all(listenUrls.filter(url => !alreadyListeningUrls.includes(url)).map(async url =>
                {
                    await serverHandlers.process(url, container, { signal: context.abort.signal });
                    console.log(`${container.name} listening on ${url.toString()}`)
                }));
                if (alreadyListeningUrls.length)
                {
                    const containerRouter = container.attach(trigger);
                    container.register('$mainRouter', containerRouter);
                    if (alreadyListeningUrls.some(url => url.pathname.length > 1))
                        router.useMiddleware(alreadyListeningUrls[0].pathname, containerRouter);
                    else
                        router.useMiddleware(containerRouter);
                    console.log(`${container.name} listening on ${alreadyListeningUrls[0].pathname} on ${urls.map(url => url.toString()).join(', ')}`)
                }
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
