import { ChildProcess } from "child_process";
import type { AllEventKeys } from "./events/event-bus.js";
import { EventEmitter, type AllEvents } from "./events/event-emitter.js";
import type { EventListener, EventOptions } from "./events/shared.js";
import { IsomorphicBuffer } from "./helpers.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./network.js";
import { StatefulSubscription, type Subscription } from "./teardown-manager.js";
import { Deferred } from "./promiseHelpers.js";

export class ProcessStdioAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    messageEvent: (args_0: string | IsomorphicBuffer) => void;
    openEvent: (args_0: Event) => void;
    closeEvent: (args_0: CloseEvent) => void;
    errorEvent: (args_0: Event) => void;
    get open(): boolean { return !!this.process.pid; }

    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    async close()
    {
        this.off('message');
        this.off('error');
        this.closeEvent(null);
    }
    send(data: string | IsomorphicBuffer): Promise<void>
    {
        if (typeof data === 'string')
            return new Promise<void>((resolve, reject) => this.process.stdout.write(data, err => err ? reject(err) : resolve()));
        return new Promise<void>((resolve, reject) => this.process.stdout.write(data.toArray(), err => err ? reject(err) : resolve()));
    }

    private readonly messageListeners: [(ev: unknown) => void, (ev: unknown) => void][] = [];

    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler?: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
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
                        this.process.stdin.off('data', listener[1]);
                        result = !!this.messageListeners.splice(this.messageListeners.indexOf(listener), 1)?.length || result;
                    }
                }
                break;
            case 'open':
                return false;
            case 'close':
            case 'error':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.process.stdout.off(event, handler as any);
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
                    const x = function (data) { return (handler as EventListener<SocketAdapterAkalaEventMap['message']>).call(this, typeof data === 'string' ? data : IsomorphicBuffer.fromBuffer(data)); };
                    this.messageListeners.push([handler, x]);
                    if (options?.once)
                        this.process.stdin.once('data', x);
                    else
                        this.process.stdin.on('data', x);
                    return new StatefulSubscription(() =>
                    {
                        this.messageListeners.splice(this.messageListeners.findIndex(x => x[0] === handler), 1);
                        this.process.stdin.off('message', x);
                    }).unsubscribe;
                }
            case 'open':
                handler(null);
                break;
            case 'close':
            case 'error':
                if (options?.once)
                    this.process.stdin.once(event, handler);
                else
                    this.process.stdin.on(event, handler);
                return new StatefulSubscription(() =>
                {
                    this.process.stdin.off(event, handler);
                }).unsubscribe;
            case Symbol.dispose:
                return super.on(event, handler, options);
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
            case Symbol.dispose:
                return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
            default:
                let x: never = event;
                throw new Error(`Unsupported event ${x}`);
        }
    }

    constructor(private process: NodeJS.Process, abort: AbortSignal)
    {
        super();
        abort.addEventListener('abort', () =>
        {
            this.close();
        });
        this.messageEvent = this.getOrCreate('message').emit.bind(this.get('message'));
        this.closeEvent = this.getOrCreate('close').emit.bind(this.get('close'));
        this.errorEvent = this.getOrCreate('error').emit.bind(this.get('error'));
    }

}


export class ChildProcessStdioAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    messageEvent: (args_0: string) => void;
    openEvent: (args_0: Event) => void;
    closeEvent: (args_0: CloseEvent) => void;
    get open(): boolean { return !!this.process.pid; }


    pipe(socket: SocketAdapter)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close()
    {
        const deferred = new Deferred<void>();
        this.process.on('disconnect', () => deferred.resolve());
        this.process.disconnect();
        return deferred;
    }
    send(data: string)
    {
        return new Promise<void>((resolve, reject) => this.process.stdin.write(data + '\n', err => err ? reject(err) : resolve()));
    }
    off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>): boolean
    {
        const result = super.off(event, handler);
        if (!super.hasListener(event))
            switch (event)
            {
                case 'message':
                    this.process.stdout.off('data', this.messageEvent);
                    break;
                case 'close':
                    this.process.stdout.off('end', this.closeEvent);
                    break;
            }

        return result;
    }

    public on<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        if (!this.events[event].hasListeners)
            switch (event)
            {
                case 'message':
                    if (options?.once)
                        this.process.stdout.once('data', this.messageEvent);
                    else
                        this.process.stdout.on('data', this.messageEvent);
                    break;
                case 'open':
                    handler(null);
                    return () => false;
                case 'close':
                    if (options?.once)
                        this.process.stdout.once('close', this.closeEvent);
                    else
                        this.process.stdout.on('close', this.closeEvent);
                    break;
            }

        return super.on(event, handler, options);
    }

    once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>, options?: Omit<EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>, 'once'>): Subscription
    {
        return this.on(event, handler, { ...options, once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>)
    }

    constructor(private process: ChildProcess, abort: AbortSignal)
    {
        super();
        abort.addEventListener('abort', () => this[Symbol.dispose]());
        this.messageEvent = this.getOrCreate('message').emit.bind(this.get('message'));
        this.closeEvent = this.getOrCreate('close').emit.bind(this.get('close'));
    }

}
