import type { AllEventKeys, AllEvents, EventArgs, EventListener, EventOptions, EventReturnType, Subscription } from "@akala/core";
import { ErrorWithStatus, StatefulSubscription, AsyncTeardownManager } from "@akala/core";
import type { SocketAdapter, SocketAdapterAkalaEventMap } from "@akala/core";
import { MessagePort, Worker } from "worker_threads";

export class MessagePortAdapter extends AsyncTeardownManager implements SocketAdapter
{
    private isOpen: boolean = true;

    get open(): boolean { return this.isOpen; }
    close(): void
    {
        if (this.cp instanceof Worker)
            this.cp.terminate();
        else
            this.cp.close();
    }
    send(data: string): void
    {
        this.cp.postMessage(data);
    }

    public on<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                if (options?.once)
                    this.cp.on('message', handler);
                else
                    this.cp.on('message', handler);
                return new StatefulSubscription(() => this.cp.off('message', handler)).unsubscribe;
            case 'open':
                handler(null);
                break;
            case 'close':
                if (options?.once)
                    this.cp.once('disconnect', handler);
                else
                    this.cp.on('disconnect', handler);
                return new StatefulSubscription(() => this.cp.off('disconnect', handler)).unsubscribe;
        }
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
    ): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>)
    }


    constructor(private cp: MessagePort | Worker)
    {
        super();
        cp.on('close', () => this.isOpen = false);
    }

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): boolean
    {
        switch (event)
        {
            case 'message':
                this.cp.off('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.off('disconnect', handler);
                break;
        }
        return true;
    }


    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    // _write(chunk: string | Buffer, encoding: string, callback: (error?: any) => void)
    // {
    //     // The underlying source only deals with strings.
    //     if (Buffer.isBuffer(chunk))
    //         chunk = chunk.toString('utf8');
    //     if (this.cp.send)
    //         this.cp.send(chunk + '\n', callback);
    //     else
    //         callback(new Error('there is no send method on this process'));
    // }

    // _read()
    // {
    // }


    hasListener<const TKey extends AllEventKeys<SocketAdapterAkalaEventMap>>(name: TKey)
    {
        if (name === 'open')
            return false;
        return !!this.cp.listenerCount(name);
    }
    get definedEvents(): AllEventKeys<SocketAdapterAkalaEventMap>[]
    {
        return (['close', 'error', 'message'] as const).filter(ev => this.hasListener(ev));
    }

    emit<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, ...args: EventArgs<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>): false | EventReturnType<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    {
        throw new ErrorWithStatus(501, "Method not implemented.");
    }
}
