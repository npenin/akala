import type { AllEventKeys, EventBus, SpecialEvents } from "./events/event-bus.js";
import { type AllEvents, EventEmitter } from "./events/event-emitter.js";
import type { IEvent, EventListener, EventOptions } from "./events/shared.js";
import type { IsomorphicBuffer } from "./helpers.js";
import { Subscription } from "./teardown-manager.js";

export interface SocketAdapterEventMap<T = string | IsomorphicBuffer> 
{
    message: T;
    open: Event;
    error: Event;
    close: CloseEvent;
}

export type SocketAdapterAkalaEventMap<T = string | IsomorphicBuffer> = { [key in keyof SocketAdapterEventMap<T>]: IEvent<[SocketAdapterEventMap<T>[key]], void> }

export interface SocketAdapter<T = string | IsomorphicBuffer> extends EventBus<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>
{
    readonly open: boolean;
    close(): Promise<void>;
    send(data: T): Promise<void>;
    pipe(socket: SocketAdapter<T>): void;
}


export class SocketProtocolAdapter<T> extends EventEmitter<SocketAdapterAkalaEventMap<T>> implements SocketAdapter<T>
{
    constructor(private readonly transform: {
        receive: (data: string | IsomorphicBuffer) => T,
        send: (data: T) => string | IsomorphicBuffer,
        close?: (socket: SocketAdapter) => Promise<void>
    }, private readonly socket: SocketAdapter)
    {
        super();
    }

    pipe(socket: SocketAdapter<T>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    get open(): boolean
    {
        return this.socket.open
    }

    async close(): Promise<void>
    {
        await this.transform.close?.(this.socket);
        await this.socket.close();
    }

    send(data: T): Promise<void>
    {
        return this.socket.send(this.transform.send(data));
    }

    private readonly messageListeners: ((ev: T) => void)[] = [];
    private messageSubscription: Subscription;

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
                    listeners.forEach(l => this.socket.off('message', l[1]));
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

                    if (this.messageListeners.length === 0)
                        this.messageSubscription = this.socket.on('message', message =>
                        {
                            const m = this.transform.receive(message);
                            this.messageListeners.forEach(l => l(m))
                        }, options);
                    this.messageListeners.push(handler as EventListener<SocketAdapterAkalaEventMap<T>['message']>);
                    return () =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x[0] === handler), 1);
                        if (this.messageListeners.length === 0 && this.messageSubscription)
                            return this.messageSubscription();
                    };
                }

            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                return this.socket.on(event, handler as any);
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
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap<T>>[TEvent]>);
            default:
                throw new Error(`Unsupported event ${event?.toString()}`);
        }
    }
}
