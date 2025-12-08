import { EventEmitter, type AllEventKeys, type EventListener, type SpecialEvents, type EventOptions, type AllEvents, type EventArgs, type EventReturnType } from "../index.browser.js";
import { Subscription } from "../teardown-manager.js";
import { SocketAdapterAkalaEventMap, SocketAdapter } from "./shared.js";
import { SocketProtocolTransformer } from "./shared.transformer.js";

/**
 * Adapts a socket connection to handle protocol-level message transformations.
 * Provides an event-based interface for managing socket communication with custom
 * serialization/deserialization logic.
 * @template T The type of messages after transformation
 */

export class SocketProtocolAdapter<T> extends EventEmitter<SocketAdapterAkalaEventMap<T>> implements SocketAdapter<T>
{
    /**
     * Creates a new socket protocol adapter.
     * @param transform Configuration object containing receive, send, and optional close handlers
     * @param transform.receive Function to deserialize incoming data into application messages
     * @param transform.send Function to serialize application messages for transmission
     * @param transform.close Optional function to perform protocol-specific cleanup
     * @param socket The underlying socket adapter to wrap
     */
    constructor(public readonly transform: SocketProtocolTransformer<T>, private readonly socket: SocketAdapter)
    {
        super();
        this.on(Symbol.dispose, () => socket.close());
    }

    /**
     * Pipes incoming messages to another socket adapter.
     * @param socket The destination socket to send messages to
     */
    pipe(socket: SocketAdapter<T>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    /**
     * Gets the open status of the underlying socket.
     */
    get open(): boolean
    {
        return this.socket.open;
    }

    /**
     * Closes the socket and performs any necessary protocol cleanup.
     */
    async close(): Promise<void>
    {
        await this.transform.close?.(this.socket);
        await this.socket.close();
    }

    /**
     * Sends a message through the socket after applying the send transformation.
     * @param data The message to send
     */
    send(data: T): Promise<void>
    {
        return this.socket.send(this.transform.send(data, this));
    }

    private readonly messageListeners: ((ev: T) => void)[] = [];
    private messageSubscription: Subscription;

    /**
     * Removes an event listener from the adapter.
     * @param event The event type to remove the listener from
     * @param handler The event handler to remove, or undefined to remove all handlers
     * @returns true if the listener was successfully removed
     */
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
                        this.messageListeners.splice(listeners.findIndex(f => f[0] == handler), 1);

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

    /**
     * Registers an event listener on the adapter.
     * @param event The event type to listen for
     * @param handler The callback to invoke when the event occurs
     * @param options Optional event listener configuration
     * @returns A subscription function to unsubscribe from the event
     */
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

    /**
     * Registers an event listener that fires only once.
     * @param event The event type to listen for
     * @param handler The callback to invoke when the event occurs
     * @returns A subscription function to unsubscribe from the event
     */
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

    /**
     * Emits an event to all registered listeners.
     * @param event The event type to emit
     * @param args Arguments to pass to event listeners
     * @returns The result of the emit operation
     */
    override emit<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap<T>>>(event: TEvent, ...args: EventArgs<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): false | EventReturnType<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    {
        return super.emit(event, ...args);
    }
}
