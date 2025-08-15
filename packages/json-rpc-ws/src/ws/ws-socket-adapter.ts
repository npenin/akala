import ws from 'ws';
import type { SocketAdapter, SocketAdapterAkalaEventMap } from '../shared-connection.js';
import { type AllEventKeys, type AllEvents, ErrorWithStatus, type EventArgs, type EventListener, type EventOptions, type EventReturnType, HttpStatusCode, StatefulSubscription, type Subscription, AsyncTeardownManager } from '@akala/core';

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export default class WsSocketAdapter extends AsyncTeardownManager implements SocketAdapter
{
    constructor(private socket: ws)
    {
        super();
    }

    hasListener<const TKey extends AllEventKeys<SocketAdapterAkalaEventMap>>(name: TKey)
    {
        return !!this.socket.listenerCount(name);
    }
    get definedEvents(): AllEventKeys<SocketAdapterAkalaEventMap>[]
    {
        return ['message', 'close', 'error', 'open'].filter(k => this.socket.listenerCount(k)) as AllEventKeys<SocketAdapterAkalaEventMap>[]
    }
    emit<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, ...args: EventArgs<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>): false | EventReturnType<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Method not implemented.');
    }

    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    get open(): boolean
    {
        return this.socket.readyState == ws.OPEN;
    }

    close(): void
    {
        this.socket.close();
    }

    send(data: string): void
    {
        this.socket.send(data, { binary: false });
    }

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): boolean
    {
        if (event === 'message')
        {
            this.socket.removeAllListeners(event);
        }
        else
            this.socket.off(event, handler);

        return true;
    }

    private readonly messageListeners: [(ev: unknown) => void, (data: ws.Data, isBinary: boolean) => void][] = [];

    public on<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        if (event === 'message')
        {
            function x(data: ws.Data, isBinary: boolean)
            {
                if (!isBinary)
                {
                    if (Buffer.isBuffer(data))
                        (handler as EventListener<SocketAdapterAkalaEventMap['message']>).call(this, data.toString('utf8'));
                    else
                        (handler as EventListener<SocketAdapterAkalaEventMap['message']>).call(this, data);
                }
                else
                    (handler as EventListener<SocketAdapterAkalaEventMap['message']>).call(this, data);

            }
            this.messageListeners.push([handler, x]);
            if (options?.once)
                this.socket.once(event, x);
            else
                this.socket.on(event, x);
            return new StatefulSubscription(() => this.socket.off(event, x)).unsubscribe;
        }
        else
        {
            if (options?.once)
                this.socket.once(event, handler);
            else
                this.socket.on(event, handler);
            return new StatefulSubscription(() => this.socket.off(event, handler)).unsubscribe;
        }
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
    }
}
