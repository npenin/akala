/// <reference types="vite/client" />
import { Container, Metadata, Processors, registerCommands } from "@akala/commands";
import { SocketAdapter, SocketAdapterEventMap } from "@akala/json-rpc-ws";
import { bootstrapModule, IScope, templateCache, templateFunction } from "@akala/client";
import { isPromiseLike } from "@akala/core";

const container = new Container('akala', null);

class ViteSocketAdapter implements SocketAdapter
{
    readonly open: boolean = true;
    close(): void
    {
        throw new Error('Method not implemented.');
    }
    send(data: string): void
    {
        import.meta.hot.send('jsonrpc', data)
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            import.meta.hot.on('jsonrpc', handler);
    }
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        const wrapper = function (...args)
        {
            try
            {
                return handler.apply(this, args);
            }
            finally
            {
                import.meta.hot.off('jsonrpc', wrapper);
            }
        }
        import.meta.hot.on('jsonrpc', wrapper);
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            import.meta.hot.off('jsonrpc', handler);
    }
    pipe(socket: SocketAdapter<unknown>): void
    {
        throw new Error('Method not implemented.');
    }
}

if (import.meta.hot)
{
    import.meta.hot?.on('template-reload', (data) =>
    {
        const f = templateCache.resolve<Promise<templateFunction> | templateFunction>(data.path);
        if (f)
            if (isPromiseLike(f))
                f.then(template => template.hotReplace(data.content));
            else
                f.hotReplace(data.content);
    });

    const processor = new Processors.JsonRpcBrowser(Processors.JsonRpcBrowser.getConnection(new ViteSocketAdapter(), container));
    const authProcessor = new Processors.AuthPreProcessor(processor)
    const eventProcessor = new Processors.EventProcessor(authProcessor);

    bootstrapModule.activateAsync(['$rootScope'], async (rootScope: IScope<object>) =>
    {
        rootScope.$set('container', container)
        rootScope.$set('$commandEvents', eventProcessor)
        rootScope.$set('$authProcessor', authProcessor)

        await processor.handle(container, Metadata.extractCommandMetadata(container.resolve('$metadata')), { params: [true] }).
            then(err => Promise.reject(err), (metadata: Metadata.Container) =>
            {
                console.log(metadata);
                registerCommands(metadata.commands, eventProcessor, container);
            });
    })
}
