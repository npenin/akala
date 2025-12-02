import type { AllEventKeys } from "./events/event-bus.js";
import { EventEmitter, type AllEvents } from "./events/event-emitter.js";
import type { EventListener, EventOptions } from "./events/shared.js";
import { IsomorphicBuffer } from "./helpers.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./network.js";
import { type Subscription, StatefulSubscription } from "./teardown-manager.js";
import { Socket } from 'dgram';
import os from 'os';

export interface RemoteInfo
{
    address: string;
    port: number
}

export interface UdpMessage
{
    message: IsomorphicBuffer
    remote: RemoteInfo
}

export type UdpSocketAdapterAkalaEventMap = SocketAdapterAkalaEventMap<UdpMessage>;

export class UdpSocketAdapter extends EventEmitter<SocketAdapterAkalaEventMap<UdpMessage>> implements SocketAdapter<UdpMessage>
{
    constructor(private readonly socket: Socket)
    {
        super();
    }

    pipe(socket: SocketAdapter<UdpMessage>)
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
        if (!interfaceAddress)
        {
            for (const netifs of Object.values(os.networkInterfaces()))
            {
                const netif = netifs.find(netif => netif.family == 'IPv4');
                if (!netif)
                    continue;
                this.socket.addMembership(address, netif.address);
            }
        }
        else
            this.socket.addMembership(address, interfaceAddress);
    }

    public bind(port: number, address?: string)
    {
        this.teardown(() => { const wasOpen = this.open; this.socket.close(); return wasOpen })
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

    send(data: UdpMessage): Promise<void>
    {
        if (data.remote?.port)
            if (data.remote?.address)
                return new Promise((resolve, reject) => this.socket.send(data.message.toArray(), data.remote.port, data.remote.address, err =>
                    err ? reject(err) : resolve()));
            else
                return new Promise((resolve, reject) => this.socket.send(data.message.toArray(), data.remote.port, err => err ? reject(err) : resolve()));
        else
            return new Promise((resolve, reject) => this.socket.send(data.message.toArray(), err => err ? reject(err) : resolve()));
    }

    private readonly messageListeners: [(ev: unknown, x) => void, (ev: unknown, x) => void][] = [];

    public off<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>
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

    public on<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                {
                    const x = function (data: Uint8Array, remote: RemoteInfo)
                    {
                        return (handler as EventListener<UdpSocketAdapterAkalaEventMap['message']>).call(this, { message: IsomorphicBuffer.fromBuffer(data), remote });
                    };
                    this.messageListeners.push([handler, x]);
                    if (options?.once)
                        this.socket.once('message', x);
                    else
                        this.socket.on('message', x);
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

    public once<const TEvent extends AllEventKeys<UdpSocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>);
            case 'close':
            case 'error':
            case 'open':
            case Symbol.dispose:
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<UdpSocketAdapterAkalaEventMap>[TEvent]>);
            default:
                let x: never = event;
                throw new Error(`Unsupported event ${x}`);
        }
    }
}
