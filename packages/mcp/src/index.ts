import { SocketAdapter, SocketAdapterAkalaEventMap } from "@akala/json-rpc-ws";
import { ChildProcess } from 'child_process'
import { AllEventKeys, AllEvents, EventEmitter, EventListener, EventOptions, Subscription } from "@akala/core";

export class ProcessStdioAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
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

    close(): void
    {
        this.process.disconnect();
    }
    send(data: string): void
    {
        this.process.stdout.write(data + '\n');
    }
    off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>): boolean
    {
        const result = super.off(event, handler);
        if (!super.hasListener(event))
            switch (event)
            {
                case 'message':
                    this.process.stdin.off('data', this.messageEvent);
                    break;
                case 'close':
                    this.process.off('disconnect', this.closeEvent);
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
        if (!this.events[event]?.hasListeners)
            switch (event)
            {
                case 'message':
                    if (options?.once)
                        this.process.stdin.once('data', this.messageEvent);
                    else
                        this.process.stdin.on('data', this.messageEvent);
                    break;
                case 'open':
                    handler(null);
                    return () => false;
                case 'close':
                    if (options?.once)
                        this.process.stdin.once('close', this.closeEvent);
                    else
                        this.process.stdin.on('close', this.closeEvent);
                    break;
            }

        return super.on(event, handler, options);
    }

    once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(event: TEvent, handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>, options?: Omit<EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>, 'once'>): Subscription
    {
        return this.on(event, handler, { ...options, once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>)
    }

    constructor(private process: NodeJS.Process, abort: AbortSignal)
    {
        super();
        abort.addEventListener('abort', () => this[Symbol.dispose]());
        this.messageEvent = this.getOrCreate('message').emit.bind(this.get('message'));
        this.closeEvent = this.getOrCreate('close').emit.bind(this.get('close'));
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

    close(): void
    {
        this.process.disconnect();
    }
    send(data: string): void
    {
        this.process.stdin.write(data + '\n');
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
                    this.process.off('disconnect', this.closeEvent);
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
