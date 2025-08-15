import { ChildProcess } from "child_process";
import type { AllEventKeys, AllEvents, EventArgs, EventListener, EventOptions, EventReturnType, SocketAdapter, SocketAdapterAkalaEventMap, Subscription } from "@akala/core";
import { ErrorWithStatus, StatefulSubscription, AsyncTeardownManager, Deferred } from "@akala/core";

export class IpcAdapter extends AsyncTeardownManager implements SocketAdapter
{
    get open(): boolean { return !!this.cp.pid; }


    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close()
    {
        const deferred = new Deferred<void>();
        this.cp.on('disconnect', () => deferred.resolve());
        this.cp.disconnect();
        return deferred;
    }
    send(data: string): void
    {
        if (this.cp.send)
            this.cp.send(data + '\n');

        else
            console.warn(`process ${this.cp.pid} does not support send over IPC`);
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

    constructor(private cp: ChildProcess | typeof process)
    {
        super();
    }
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
