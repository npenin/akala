import { CommandMetadataProcessorSignature, protocolHandlers, registerCommands } from '@akala/commands';
import { Container, Processors } from '@akala/commands'
import { SocketAdapter, SocketAdapterEventMap } from '@akala/json-rpc-ws';
import { MiddlewareAsync } from '@akala/core'
import { readFile } from 'fs/promises';
import { Plugin, ViteDevServer } from 'vite';
import { fileURLToPath, pathToFileURL } from 'url'

export class ViteSocketAdapter implements SocketAdapter
{
    constructor(private server: ViteDevServer)
    {
    }

    open = true;
    close()
    {
        this.open = false;
        return this.server.ws.close();
    }
    send(data: any)
    {
        this.server.ws.send('jsonrpc', data)
    }
    on<const K extends keyof SocketAdapterEventMap>(event: K, handler: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            this.server.ws.on('jsonrpc', handler);
        if (event == 'close')
            this.server.ws.on('vite:ws:disconnect', () => { console.log('disconnect'); return handler(new CloseEvent('close', {}) as SocketAdapterEventMap[K]) });
    }
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        const self = this;
        const wrapper = function (...args)
        {
            try
            {
                return handler.apply(this, args);
            }
            finally
            {
                self.server.ws.off('jsonrpc', wrapper);
            }
        }
        this.on(event, wrapper);
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            this.server.ws.off('jsonrpc', handler);
    }
    pipe(socket: SocketAdapter<unknown>): void
    {
        throw new Error('Method not implemented.');
    }
}

export function plugin(options: Record<string, { path: string, init?: unknown[], processors?: (MiddlewareAsync<CommandMetadataProcessorSignature<unknown>> | { processor: MiddlewareAsync<CommandMetadataProcessorSignature<unknown>>, priority: number })[] }>, processors?: (MiddlewareAsync<CommandMetadataProcessorSignature<unknown>> | { processor: MiddlewareAsync<CommandMetadataProcessorSignature<unknown>>, priority: number })[]): Plugin
{
    return {
        name: 'akala',
        transformIndexHtml(html)
        {
            return html.replace(/\/@vite\/client(['"])/i, (all, quote) =>
            {
                return all + '></script><script type="module" src=' + quote + '/@akala/vite/client' + quote;
            });
        },
        resolveId(source)
        {
            if (source == '/@akala/vite/client')
                return '\0' + source.substring(1);
            return null;
        },
        async load(id)
        {
            if (id == '\0@akala/vite/client')
                return { code: await readFile(fileURLToPath(import.meta.resolve('./client.js')), 'utf-8') };
        },
        async handleHotUpdate(ctx)
        {
            if (ctx.file.endsWith('.html'))
            {
                ctx.server.ws.send('template-reload', { path: ctx.file.substring(process.cwd().length + 1), content: await ctx.read() })
                return [];
            }
        },
        configureServer(server)
        {
            const container = new Container('all', null);
            const abort = new AbortController();
            server.ws.on('close', () => abort.abort('exiting...'))
            const promise = Promise.all(Object.entries(options).map(async ([name, { path, init, processors: containerProcessors }]) =>
            {
                const { processor, getMetadata } = await protocolHandlers.process(URL.canParse(path) ? new URL(path) : pathToFileURL(path), { signal: abort.signal }, {})
                const meta = await getMetadata();
                const subContainer = new Container(meta.name, {})
                // console.log(processors);
                if (processors)
                    processors.forEach(p => 'priority' in p ? subContainer.processor.useMiddleware(p.priority, p.processor) : subContainer.processor.useMiddleware(20, p));
                // console.log(containerProcessors);
                if (containerProcessors)
                    containerProcessors.forEach(p => 'priority' in p ? subContainer.processor.useMiddleware(p.priority, p.processor) : subContainer.processor.useMiddleware(20, p));
                // console.log('discovering commands in', path);
                // await Processors.FileSystem.discoverCommands(path, subContainer);
                // console.log('registering commands in', subContainer.name);

                registerCommands(meta.commands, processor, subContainer);

                container.register(subContainer);
                if (init)
                {
                    // console.log('init', init);
                    await subContainer.dispatch('$init', { param: init })
                }
            })).then(async () =>
            {
                // console.log('attaching to vite');
                container.attach(Processors.JsonRpc.trigger, new ViteSocketAdapter(server))
            });
            return () => promise;
        },
    }
}