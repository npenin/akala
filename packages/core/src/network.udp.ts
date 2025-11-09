import type { AllEventKeys } from "./events/event-bus.js";
import { EventEmitter, type AllEvents } from "./events/event-emitter.js";
import type { EventArgs, EventListener, EventOptions, IEvent } from "./events/shared.js";
import { IsomorphicBuffer } from "./helpers.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./network.js";
import { type Subscription, StatefulSubscription } from "./teardown-manager.js";
import { Socket } from 'dgram';

interface UdpSocketAdapterAkalaEventMap<T> extends Omit<SocketAdapterAkalaEventMap<T>, 'message'>
{
    message: IEvent<[T, remoteInfo?: { address: string, port: number }], void>
}

export class UdpSocketAdapter<T extends string | IsomorphicBuffer = string | IsomorphicBuffer> extends EventEmitter<UdpSocketAdapterAkalaEventMap<T>> implements SocketAdapter<T>
{
    constructor(private readonly socket: Socket)
    {
        super();
    }

    pipe(socket: SocketAdapter<T>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    /**
         * Tells the kernel to join a multicast group at the given `multicastAddress` and `multicastInterface` using the `IP_ADD_MEMBERSHIP` socket option. If the `multicastInterface` argument is not
         * specified, the operating system will choose
         * one interface and will add membership to it. To add membership to every
         * available interface, call `addMembership` multiple times, once per interface.
         *
         * When called on an unbound socket, this method will implicitly bind to a random
         * port, listening on all interfaces.
         *
         **/
    public addMembership(address: string, interfaceAddress?: string)
    {
        this.socket.addMembership(address, interfaceAddress);
    }

    public bind(port: number, address?: string)
    {
        return new Promise<void>(resolve => this.socket.bind(port, address, resolve));
    }

    private closed: boolean;

    get open(): boolean
    {
        return !this.closed
    }

    close(): Promise<void>
    {
        return new Promise(resolve => this.socket.close(() =>
        {
            this.closed = true;
            resolve();
        }));
    }

    send(data: T, port?: number, address?: string): Promise<void>
    {
        var socketData: Uint8Array | string;
        if (data instanceof IsomorphicBuffer)
            socketData = data.toArray();
        else
            socketData = data;
        if (port)
            if (address)
                return new Promise((resolve, reject) => this.socket.send(socketData, port, address, err => err ? reject(err) : resolve()));
            else
                return new Promise((resolve, reject) => this.socket.send(socketData, port, err => err ? reject(err) : resolve()));
        else
            return new Promise((resolve, reject) => this.socket.send(socketData, err => err ? reject(err) : resolve()));
    }

    private readonly messageListeners: [(ev: unknown, x) => void, (ev: unknown, x) => void][] = [];

    public off<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>
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

    public on<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>,
        options?: EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                {
                    const x = function (...args: EventArgs<UdpSocketAdapterAkalaEventMap<T>['message']>) { return (handler as EventListener<UdpSocketAdapterAkalaEventMap<T>['message']>).apply(this, args); };
                    this.messageListeners.push([handler, x]);
                    if (options?.once)
                        this.socket.once('data', x);
                    else
                        this.socket.on('data', x);
                    return new StatefulSubscription(() =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x[0] === handler), 1);
                        this.socket.off('message', x);
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

    public once<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>);
            case 'close':
            case 'error':
            case 'open':
            case Symbol.dispose:
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap<T>>[TEvent]>);
            default:
                let x: never = event;
                throw new Error(`Unsupported event ${x}`);
        }
    }
}
