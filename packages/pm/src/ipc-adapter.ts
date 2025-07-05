import { ChildProcess } from "child_process";
import * as jsonrpc from '@akala/json-rpc-ws';
import { AllEventKeys, AllEvents, ErrorWithStatus, EventArgs, EventListener, EventOptions, EventReturnType, StatefulSubscription, Subscription, TeardownManager } from "@akala/core";

export class IpcAdapter extends TeardownManager implements jsonrpc.SocketAdapter
{
    get open(): boolean { return !!this.cp.pid; }


    pipe(socket: jsonrpc.SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close(): void
    {
        this.cp.disconnect();
    }
    send(data: string): void
    {
        if (this.cp.send)
            this.cp.send(data + '\n');

        else
            console.warn(`process ${this.cp.pid} does not support send over IPC`);
    }

    public off<const TEvent extends AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>
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

    public on<const TEvent extends AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>
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

    public once<const TEvent extends AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>,
    ): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>)
    }

    constructor(private cp: ChildProcess | typeof process)
    {
        super();
    }
    hasListener<const TKey extends AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>>(name: TKey)
    {
        if (name === 'open')
            return false;
        return !!this.cp.listenerCount(name);
    }
    get definedEvents(): AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>[]
    {
        return (['close', 'error', 'message'] as const).filter(ev => this.hasListener(ev));
    }
    emit<const TEvent extends AllEventKeys<jsonrpc.SocketAdapterAkalaEventMap>>(event: TEvent, ...args: EventArgs<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>): false | EventReturnType<AllEvents<jsonrpc.SocketAdapterAkalaEventMap>[TEvent]>
    {
        throw new ErrorWithStatus(501, "Method not implemented.");
    }
}
