import type { AllEventKeys } from "./events/event-bus.js";
import { EventEmitter, type AllEvents } from "./events/event-emitter.js";
import type { EventListener, EventOptions } from "./events/shared.js";
import { IsomorphicBuffer } from "./helpers.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./network.js";
import { type Subscription, StatefulSubscription } from "./teardown-manager.js";
import { Socket } from 'net';

export class TcpSocketAdapter<T extends string | IsomorphicBuffer = string | IsomorphicBuffer> extends EventEmitter<SocketAdapterAkalaEventMap<T>> implements SocketAdapter<T>
{
    constructor(private readonly socket: Socket)
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
        return !this.socket.closed
    }

    close(): Promise<void>
    {
        return new Promise(resolve => this.socket.end(resolve));
    }

    send(data: string | IsomorphicBuffer): Promise<void>
    {
        return new Promise((resolve, reject) => this.socket.write(data instanceof IsomorphicBuffer ? data.toArray() : data, err => err ? reject(err) : resolve()));
    }

    private readonly messageListeners: [(ev: unknown) => void, (ev: unknown) => void][] = [];

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>
    ): boolean
    {
        switch (event)
        {
            case 'message':
                {
                    let listeners = this.messageListeners;
                    if (handler)
                        listeners = listeners.filter(f => f[0] == handler);
                    var result = false;
                    for (const listener of listeners)
                    {
                        this.socket.off('message', listener[1]);
                        result = !!this.messageListeners.splice(this.messageListeners.indexOf(listener), 1)?.length || result;
                    }
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.off(event, handler as any);
                break;
            default:
                throw new Error(`Unsupported event ${String(event)}`);
        }
        return true;
    }

    public on<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                {
                    const x = function (data) { return (handler as EventListener<SocketAdapterAkalaEventMap<T>['message']>).call(this, typeof data === 'string' ? data : IsomorphicBuffer.fromBuffer(data)); };
                    this.messageListeners.push([handler, x]);
                    if (options?.once)
                        this.socket.once('data', x);
                    else
                        this.socket.on('data', x);
                    return new StatefulSubscription(() =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x[0] === handler), 1);
                        this.socket.off('data', x);
                    }).unsubscribe;
                }

            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (options?.once)
                    this.socket.once(event, handler);
                else
                    this.socket.on(event, handler);
                return new StatefulSubscription(() =>
                {
                    this.socket.off(event, handler);
                }).unsubscribe;
            case Symbol.dispose:
                return super.on(event, handler, options);
            default:
                throw new Error(`Unsupported event ${String(event)}`);
        }
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>);
            case 'close':
            case 'error':
            case 'open':
            case Symbol.dispose:
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>);
            default:
                let x: never = event;
                throw new Error(`Unsupported event ${x}`);
        }
    }
}
