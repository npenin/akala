import type { AllEventKeys } from "./events/event-bus.js";
import { EventEmitter, type AllEvents } from "./events/event-emitter.js";
import type { EventListener, EventOptions } from "./events/shared.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./network.js";
import { Deferred } from "./promiseHelpers.js";
import { type Subscription, StatefulSubscription } from "./teardown-manager.js";

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */


export class WebSocketAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    constructor(private readonly socket: WebSocket)
    {
        super();
    }

    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    get open(): boolean
    {
        return this.socket.readyState == WebSocket.OPEN;
    }

    close(): Promise<void>
    {
        const deferred = new Deferred<void>();
        this.socket.addEventListener('close', () => deferred.resolve());
        this.socket.close();
        return deferred;
    }

    send(data: string): void
    {
        this.socket.send(data);
    }

    private readonly messageListeners: [(ev: unknown) => void, (ev: unknown) => void][] = [];

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): boolean
    {
        switch (event)
        {
            case 'message':
                {
                    let listeners = this.messageListeners;
                    if (handler)
                        listeners = listeners.filter(f => f[0] == handler);
                    listeners.forEach(l => this.socket.removeEventListener('message', l[1]));
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.removeEventListener(event, handler as any);
                break;
            default:
                throw new Error(`Unsupported event ${String(event)}`);
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
                {
                    const x = function (ev) { return (handler as EventListener<SocketAdapterAkalaEventMap['message']>).call(this, ev.data); };
                    this.messageListeners.push([handler, x]);
                    this.socket.addEventListener('message', x, options);
                    return new StatefulSubscription(() =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x[0] === handler), 1);
                        this.socket.removeEventListener('message', x);
                    }).unsubscribe;
                }

            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.addEventListener(event, handler as any);
                return new StatefulSubscription(() =>
                {
                    this.socket.removeEventListener(event, handler as any);
                }).unsubscribe;
            default:
                throw new Error(`Unsupported event ${String(event)}`);
        }
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
            case 'close':
            case 'error':
            case 'open':
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
            default:
                throw new Error(`Unsupported event ${event?.toString()}`);
        }
    }
}
