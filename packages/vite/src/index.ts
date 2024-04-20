import { Triggers } from '@akala/commands';
import { Container, Processors } from '@akala/commands'
import { SocketAdapter, SocketAdapterEventMap } from '@akala/json-rpc-ws';
import { readFile } from 'fs/promises';
import { Plugin, ViteDevServer } from 'vite';
import { fileURLToPath } from 'url'

export class ViteSocketAdapter implements SocketAdapter
{
    constructor(private server: ViteDevServer) { }

    open = true;
    close()
    {
        throw new Error('Method not implemented.');
    }
    send(data)
    {
        this.server.hot.send('jsonrpc', data)
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            this.server.hot.on('jsonrpc', handler);
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
                self.server.hot.off('jsonrpc', wrapper);
            }
        }
        this.server.hot.on('jsonrpc', wrapper);
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            this.server.hot.off('jsonrpc', handler);
    }
    pipe(socket: SocketAdapter<unknown>): void
    {
        throw new Error('Method not implemented.');
    }
}

export function plugin(options: Record<string, { path: string, init?: unknown[] }>): Plugin
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
                ctx.server.hot.send('template-reload', { path: ctx.file.substring(process.cwd().length + 1), content: await ctx.read() })
                return [];
            }
        },
        configureServer(server)
        {
            const container = new Container('all', null);
            const promise = Promise.all(Object.entries(options).map(async ([name, { path, init }]) =>
            {
                const subContainer = new Container(name, {})
                // console.log('discovering commands in', path);
                await Processors.FileSystem.discoverCommands(path, subContainer);
                // console.log('registering commands in', subContainer.name);
                container.register(subContainer);
                if (init)
                {
                    // console.log('init', init);
                    await subContainer.dispatch('$init', { param: init })
                }
            })).then(async () =>
            {
                // console.log('attaching to vite');
                container.attach(Triggers.jsonrpcws, new ViteSocketAdapter(server))
            });
            return () => promise;
        },
    }
}