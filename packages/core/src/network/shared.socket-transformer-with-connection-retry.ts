import type { EventKeys, SpecialEvents, EventArgs, EventReturnType, EventListener, EventOptions, IsomorphicBuffer } from "../index.browser.js";
import { AsyncTeardownManager, Subscription } from "../teardown-manager.js";
import { SocketAdapter, SocketAdapterAkalaEventMap } from "./shared.js";
import { SocketProtocolTransformer } from "./shared.transformer.js";
import { SocketProtocolAdapter } from "./shared.socket-protocol-adapter.js";

/**
 * Interface for implementing custom retry strategies for socket connections.
 */

export interface RetryStrategy
{
    /**
     * Starts the retry strategy.
     */
    start(): void;
    /**
     * Stops the retry strategy.
     */
    stop(): void;
}
;
/**
 * Implements a configurable interval-based retry strategy.
 * Retries with a delay that can be adjusted after each attempt using a step function.
 */

export class IntervalRetry implements RetryStrategy
{
    /**
     * Creates a new interval retry strategy.
     * @param handler Function to call on each retry attempt
     * @param startDelayInMs Initial delay in milliseconds before the first retry
     * @param step Function that calculates the next delay given the current delay
     */
    constructor(private handler: () => void, private readonly startDelayInMs: number, private readonly step: (current: number) => number)
    {
    }

    /**
     * Creates an IntervalRetry with a fixed delay between retries.
     * @param handler Function to call on each retry attempt
     * @param delayInMs Fixed delay in milliseconds between retries
     * @returns A new IntervalRetry instance with fixed interval
     */
    public static fixedInterval(handler: () => void, delayInMs: number)
    {
        return new IntervalRetry(handler, delayInMs, () => delayInMs);
    }

    private timeout: NodeJS.Timeout;

    /**
     * Starts the retry strategy by scheduling the first attempt.
     */
    start(): void
    {
        const nextRetry = (delayInMs: number) =>
        {
            this.timeout = setTimeout(() =>
            {
                this.handler();
                nextRetry(this.step(delayInMs));
            }, delayInMs);
        };

        if (!this.timeout)
            nextRetry(this.startDelayInMs);
    }

    /**
     * Stops the retry strategy by clearing any pending timeout.
     */
    stop(): void
    {
        if (this.timeout)
            clearTimeout(this.timeout);
        this.timeout = undefined;
    }
}
export class SocketTransformerWithConnectionRetry extends AsyncTeardownManager implements SocketProtocolTransformer<string | IsomorphicBuffer>
{
    constructor(socket: SocketAdapter, strategy: RetryStrategy)
    {
        super([socket.on('close', () => this.shouldRetry ? strategy.start() : strategy.stop())]);
    }
    /**
     * Flag indicating whether retries should be attempted on disconnection.
     */
    private shouldRetry: boolean = true;


    receive(data: string | IsomorphicBuffer, self: SocketProtocolAdapter<unknown>): string[] | IsomorphicBuffer[]
    {
        return [data] as any;
    }
    send(data: string | IsomorphicBuffer, self: SocketProtocolAdapter<unknown>): string | IsomorphicBuffer
    {
        return data;
    }
    close(socket: SocketAdapter)
    {
        this.shouldRetry = false;
        return Promise.resolve();
    }
}

/**
 * Wraps a socket adapter to automatically retry on connection loss.
 * Combines a socket adapter with a retry strategy to handle automatic reconnection attempts.
 * @template T The type of messages handled by the socket
 */

export class SocketWithConnectionRetry<T> extends AsyncTeardownManager implements SocketAdapter<T>
{
    /**
     * Flag indicating whether retries should be attempted on disconnection.
     */
    private shouldRetry: boolean = true;

    /**
     * Creates a new socket adapter with connection retry capability.
     * @param inner The underlying socket adapter to wrap
     * @param strategy The retry strategy to use on connection loss
     */
    constructor(private readonly inner: SocketAdapter<T>, readonly strategy: RetryStrategy)
    {
        super([inner.on('close', () => this.shouldRetry ? strategy.start() : strategy.stop())]);
    }

    /**
     * Gets the open status of the wrapped socket adapter.
     */
    get open(): boolean
    {
        return this.inner.open;
    };

    /**
     * Closes the socket and prevents further retry attempts.
     */
    close(): Promise<void>
    {
        this.shouldRetry = false;
        return this.inner.close();
    }
    /**
     * Sends a message through the wrapped socket adapter.
     * @param data The message to send
     */
    send(data: T): Promise<void>
    {
        return this.inner.send(data);
    }
    /**
     * Pipes incoming messages to another socket adapter.
     * @param socket The destination socket to send messages to
     */
    pipe(socket: SocketAdapter<T>): void
    {
        return this.inner.pipe(socket);
    }

    /**
     * Checks if a listener is registered for the specified event.
     * @param name The event name to check
     * @returns true if a listener is registered for the event
     */
    hasListener<const TKey extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(name: TKey): boolean
    {
        return this.inner.hasListener(name);
    }
    /**
     * Gets the list of defined event types.
     */
    get definedEvents(): EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>[]
    {
        return this.inner.definedEvents;
    }
    /**
     * Emits an event to all registered listeners.
     * @param event The event type to emit
     * @param args Arguments to pass to event listeners
     * @returns The result of the emit operation
     */
    emit<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, ...args: EventArgs<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): false | EventReturnType<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>
    {
        return this.inner.emit(event, ...args);
    }
    /**
     * Registers an event listener on the wrapped socket adapter.
     * @param event The event type to listen for
     * @param handler The callback to invoke when the event occurs
     * @param options Optional event listener configuration
     * @returns A subscription function to unsubscribe from the event
     */
    on<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, options?: EventOptions<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): Subscription
    {
        return this.inner.on(event, handler, options);
    }
    /**
     * Registers an event listener that fires only once on the wrapped socket adapter.
     * @param event The event type to listen for
     * @param handler The callback to invoke when the event occurs
     * @param options Optional event listener configuration (excluding 'once')
     * @returns A subscription function to unsubscribe from the event
     */
    once<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, options?: Omit<EventOptions<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>, "once">): Subscription
    {
        return this.inner.once(event, handler, options);
    }
    /**
     * Removes an event listener from the wrapped socket adapter.
     * @param event The event type to remove the listener from
     * @param handler The event handler to remove, or undefined to remove all handlers
     * @returns true if the listener was successfully removed
     */
    off<const TEvent extends EventKeys<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>>(event: TEvent, handler?: EventListener<(SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>)[TEvent]>): boolean
    {
        return this.inner.off(event, handler);
    }
}
