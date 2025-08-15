import { type CommandMetadataProcessorSignature, protocolHandlers, registerCommands, Container, Processors } from '@akala/commands'
import type { SocketAdapter, SocketAdapterAkalaEventMap } from "@akala/core";
import { type AllEventKeys, type AllEvents, type Argument1, EventEmitter, type EventListener, type EventOptions, type MiddlewareAsync, type Subscription } from '@akala/core'
import { readFile } from 'fs/promises';
import { type Plugin, type ViteDevServer } from 'vite';
import { fileURLToPath, pathToFileURL } from 'url'

export class ViteSocketAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    messageEvent: (args_0: string) => void;
    errorEvent: (args_0: Event) => void;
    closeEvent: (args_0: CloseEvent) => void;
    constructor(private server: ViteDevServer)
    {
        super();
        this.messageEvent = this.getOrCreate('message').emit.bind(this.getOrCreate('message'));
        this.closeEvent = this.getOrCreate('close').emit.bind(this.getOrCreate('close'));
        this.errorEvent = this.getOrCreate('error').emit.bind(this.getOrCreate('error'));

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
        return Promise.resolve();
    }
    on<const K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>, options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[K]>): Subscription
    {
        switch (event)
        {
            case 'message':

                if (!this.hasListener(event))
                    this.server.ws.on('jsonrpc', this.messageEvent);
                return super.on(event, handler, options);
            case 'close':
                const originalHandler = handler;
                handler = function () 
                {
                    console.log('disconnect');
                    return originalHandler(new CloseEvent('close', {}) as Argument1<SocketAdapterAkalaEventMap['close']>)
                } as EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>;

                if (!this.hasListener(event))
                {
                    this.server.ws.on('vite:ws:disconnect', this.closeEvent);
                    super.on('close', () => console.log('disconnect'));
                }
                return super.on(event, handler, options);
            case 'open':
                handler(null);
                return () => false;
            case 'error':
                if (!this.hasListener(event))
                    this.server.ws.on('error', this.errorEvent);
                return super.on(event, handler, options);
        }
    }
    once<K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[K]>);
    }
    off<K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler?: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>): boolean
    {
        const result = super.off(event, handler)
        if (result && !this.hasListener(event))
        {
            switch (event)
            {
                case 'message':
                    this.server.ws.off('jsonrpc', handler);
                    break;
                case 'close':
                    this.server.ws.off('close', this.closeEvent);
                    break;
                case 'error':
                    this.server.ws.off('error', this.errorEvent);
                    break;

            }
        }

        return true;
    }
    pipe(socket: SocketAdapter): void
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
                    await subContainer.dispatch('$init', { params: init, _trigger: 'vite' })
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
