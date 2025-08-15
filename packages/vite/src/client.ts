/// <reference types="vite/client" />
import { Container, Metadata, Processors, registerCommands } from "@akala/commands";
import type { SocketAdapter, SocketAdapterAkalaEventMap, AllEventKeys, AllEvents, EventListener, EventOptions, Subscription } from "@akala/core";
import { bootstrapModule, type IScope, templateCache, type templateFunction } from "@akala/client";
import { IsomorphicBuffer, EventEmitter, isPromiseLike } from "@akala/core";

const container = new Container('akala', null);

class ViteSocketAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    messageEvent: (args_0: string) => void;
    constructor()
    {
        super();
        this.messageEvent = this.getOrCreate('message').emit.bind(this.getOrCreate('message'));
    }

    readonly open: boolean = true;
    close(): Promise<void>
    {
        throw new Error('Method not implemented.');
    }
    send(data: string | IsomorphicBuffer): Promise<void>
    {
        import.meta.hot.send('jsonrpc', data instanceof IsomorphicBuffer ? data.toArray() : data);
        return Promise.resolve();
    }
    on<K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>, options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[K]>): Subscription
    {
        if (event == 'message')
        {
            if (!this.hasListener(event))
                import.meta.hot.on('jsonrpc', this.messageEvent);
            return super.on(event, handler, options);
        }

    }
    once<K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[K]>)
    }
    off<K extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: K, handler?: EventListener<AllEvents<SocketAdapterAkalaEventMap>[K]>): boolean
    {
        const result = super.off(event, handler)

        if (event == 'message' && !this.hasListener(event))
            import.meta.hot.off('jsonrpc', this.messageEvent)

        return result;
    }
    pipe(socket: SocketAdapter): void
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
