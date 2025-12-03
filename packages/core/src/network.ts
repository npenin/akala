import type { AllEventKeys, EventBus, SpecialEvents } from "./events/event-bus.js";
import { type AllEvents, EventEmitter } from "./events/event-emitter.js";
import type { IEvent, EventListener, EventOptions, EventArgs, EventReturnType, EventKeys } from "./events/shared.js";
import type { IsomorphicBuffer } from "./helpers.js";
import { AsyncTeardownManager, Subscription } from "./teardown-manager.js";

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

// export type SocketProtocolAdapter<T> = SocketAdapter<T>;


export class SocketProtocolAdapter<T> extends EventEmitter<SocketAdapterAkalaEventMap<T>> implements SocketAdapter<T>
{
    constructor(public readonly transform: {
        receive: (data: string | IsomorphicBuffer, self: SocketProtocolAdapter<T>) => T[],
        send: (data: T, self: SocketProtocolAdapter<T>) => string | IsomorphicBuffer,
        close?: (socket: SocketAdapter) => Promise<void>
    }, private readonly socket: SocketAdapter)
    {
        super();
        this.on(Symbol.dispose, () => socket.close());
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
        return this.socket.send(this.transform.send(data, this));
    }

    private readonly messageListeners: ((ev: T) => void)[] = [];
    private messageSubscription: Subscription;

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    ): boolean
    {
        switch (event)
        {
            case 'message':
                {
                    let listeners = this.messageListeners;
                    if (handler)
                        this.messageListeners.splice(listeners.findIndex(f => f[0] == handler), 1)
                    else
                        this.messageListeners.length = 0;
                    if (this.messageListeners.length == 0)
                        this.messageSubscription?.();
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
        handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>,
        options?: EventOptions<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    ): Subscription
    {
        switch (event)
        {
            case 'message':
                {

                    if (this.messageListeners.length === 0)
                        this.messageSubscription = this.socket.on('message', message =>
                        {
                            const m = this.transform.receive(message, this);
                            for (const message of m)
                                for (const listener of this.messageListeners)
                                    listener(message);
                        }, options);
                    this.messageListeners.push(handler as EventListener<SocketAdapterAkalaEventMap<T>['message']>);
                    return () =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x === handler), 1);
                        if (this.messageListeners.length === 0 && this.messageSubscription)
                            return this.messageSubscription();
                    };
                }

            case 'close':
            case 'error':
            case 'open':
            case Symbol.dispose:
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                return this.socket.on(event, handler as any);
            default:
                throw new Error(`Unsupported event ${String(event)}`);
        }
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(
        event: TEvent,
        handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
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

    override emit<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(event: TEvent, ...args: EventArgs<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): false | EventReturnType<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    {
        return super.emit(event, ...args);
    }
}

export interface RetryStrategy
{
    start(): void;
    stop(): void;
};

export class IntervalRetry implements RetryStrategy
{
    constructor(private handler: () => void, private readonly startDelayInMs: number, private readonly step: (current: number) => number)
    {
    }

    public static fixedInterval(handler: () => void, delayInMs: number)
    {
        return new IntervalRetry(handler, delayInMs, () => delayInMs);
    }

    private timeout: NodeJS.Timeout;

    start(): void
    {
        const nextRetry = (delayInMs: number) =>
        {
            this.timeout = setTimeout(() =>
            {
                this.handler();
                nextRetry(this.step(delayInMs));
            }, delayInMs)
        }

        if (!this.timeout)
            nextRetry(this.startDelayInMs);
    }

    stop(): void
    {
        if (this.timeout)
            clearTimeout(this.timeout);
        this.timeout = undefined;
    }
}

export class SocketWithConnectionRetry<T> extends AsyncTeardownManager implements SocketAdapter<T>
{
    private shouldRetry: boolean = true;

    constructor(private readonly inner: SocketAdapter<T>, readonly strategy: RetryStrategy)
    {
        super([inner.on('close', () => this.shouldRetry ? strategy.start() : strategy.stop())]);
    }

    get open(): boolean
    {
        return this.inner.open;
    };

    close(): Promise<void>
    {
        this.shouldRetry = false;
        return this.inner.close();
    }
    send(data: T): Promise<void>
    {
        return this.inner.send(data);
    }
    pipe(socket: SocketAdapter<T>): void
    {
        return this.inner.pipe(socket);
    }

    hasListener<const TKey extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(name: TKey): boolean
    {
        return this.inner.hasListener(name);
    }
    get definedEvents(): EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>[]
    {
        return this.inner.definedEvents;
    }
    emit<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, ...args: EventArgs<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): false | EventReturnType<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    {
        return this.inner.emit(event, ...args);
    }
    on<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, options?: EventOptions<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): Subscription
    {
        return this.inner.on(event, handler, options);
    }
    once<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, options?: Omit<EventOptions<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, "once">): Subscription
    {
        return this.inner.once(event, handler, options);
    }
    off<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler?: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): boolean
    {
        return this.inner.off(event, handler);
    }
}
