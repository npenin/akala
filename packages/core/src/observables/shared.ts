import EventEmitter, { Event, IEventSink, PipeEvent, ReplayEvent } from "../event-emitter.js";
import { Formatter } from "../formatters/common.js";

function noop() { }

/**
 * A class representing a replayable asynchronous event.
 * @template T - The type of the event arguments.
 * @template TReturnType - The return type of the event.
 */
export class ReplayAsyncEvent<T extends unknown[], TReturnType> extends ReplayEvent<T, Promise<TReturnType>>
{
    /**
     * Creates an instance of ReplayAsyncEvent.
     * @param {number} bufferLength - The length of the buffer.
     * @param {number} maxListeners - The maximum number of listeners.
     * @param {function} combineReturnTypes - A function to combine the return types.
     */
    constructor(
        bufferLength: number,
        maxListeners: number,
        combineReturnTypes: Event<T, TReturnType>['combineReturnTypes']
    )
    {
        super(bufferLength, maxListeners, (promises) =>
            Promise.all(promises).then((returns) => combineReturnTypes(returns))
        );
    }
}

/**
 * A class representing a valued event.
 * @template T - The type of the event arguments.
 * @template TReturnType - The return type of the event.
 * @template TOptions - The options for the event.
 */
export class ValuedEvent<T extends unknown[], TReturnType, TOptions extends { once?: boolean }> implements IEventSink<T, TReturnType, TOptions>
{
    /**
     * Creates an instance of ValuedEvent.
     * @param {T} value - The value of the event.
     */
    constructor(private value: T) { }

    hasListeners: boolean = false;

    maxListeners: number = Number.POSITIVE_INFINITY;

    /**
     * Adds a listener to the event.
     * @param {function} listener - The listener function.
     * @returns {function} A function to remove the listener.
     */
    addListener(listener: (...args: T) => void): () => boolean
    {
        listener(...this.value);
        return () => true;
    }

    /**
     * Removes a listener from the event.
     * @returns {boolean} Whether the listener was removed.
     */
    removeListener(): boolean
    {
        return false;
    }

    /**
     * Disposes of the event.
     */
    [Symbol.dispose](): void
    {
        this.value = null;
    }
}

/**
 * Creates a valued event.
 * @template T - The type of the event arguments.
 * @param {...T} args - The event arguments.
 * @returns {ValuedEvent} The valued event.
 */
export function of<T extends unknown[]>(...args: T)
{
    return new ValuedEvent(args);
}

/**
 * A class representing a debounce event.
 * @template T - The type of the event arguments.
 * @template TOptions - The options for the event.
 */
export class DebounceEvent<T extends unknown[], TOptions extends { once?: boolean }> extends PipeEvent<T, T, void, TOptions>
{
    /**
     * Creates an instance of DebounceEvent.
     * @param {IEventSink} source - The source event sink.
     * @param {number} duration - The debounce duration.
     */
    constructor(source: IEventSink<T, void, TOptions>, private duration: number)
    {
        super(source, (...args) => args, noop);
    }

    /**
     * Subscribes to the source event if required.
     */
    protected subscribeToSourceIfRequired()
    {
        let timeout: ReturnType<typeof setTimeout>;
        if (!this.subscription)
            this.subscription = this.source.addListener((...args: T) =>
            {
                if (timeout)
                    clearTimeout(timeout);
                timeout = setTimeout(() => super.emit(...args), this.duration);
            });
    }
}

/**
 * Creates a debounce event.
 * @template T - The type of the event arguments.
 * @template TOptions - The options for the event.
 * @param {IEventSink} source - The source event sink.
 * @param {number} duration - The debounce duration.
 * @returns {DebounceEvent} The debounce event.
 */
export function debounce<T extends unknown[], TOptions extends { once?: boolean }>(source: IEventSink<T, void, TOptions>, duration: number)
{
    return new DebounceEvent(source, duration);
}

/**
 * Creates a pipe event.
 * @template T - The type of the event arguments.
 * @template U - The type of the mapped event arguments.
 * @template TOptions - The options for the event.
 * @param {IEventSink} source - The source event sink.
 * @param {function} map - The mapping function.
 * @returns {PipeEvent} The pipe event.
 */
export function pipe<T extends unknown[], U extends unknown[], TOptions extends { once?: boolean }>(source: IEventSink<T, void, TOptions>, map: (...args: T) => U)
{
    return new PipeEvent(source, map, noop);
}

export type Watcher = EventEmitter<{ 'change': Event<[source?: object]> }>;

/**
 * An abstract class representing a watcher formatter.
 * @template T - The type of the formatted value.
 */
export abstract class WatcherFormatter<T = void> implements Formatter<T>
{
    /**
     * Creates an instance of WatcherFormatter.
     * @param {Watcher} [watcher] - The watcher.
     */
    constructor(protected readonly watcher?: Watcher) { }

    /**
     * Formats a value.
     * @param {unknown} value - The value to format.
     * @returns {T} The formatted value.
     */
    abstract format(value: unknown): T;
}

export const watcher = Symbol.for("akala/watcher");
