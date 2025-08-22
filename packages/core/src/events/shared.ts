import { AsyncTeardownManager, type Subscription } from "../teardown-manager.js";

/**
 * Extracts the keys of events from an object.
 * @template T
 * @typedef {Object} EventKeys
 * @property {keyof T} key - The key of the event.
 */
export type EventKeys<T extends object> = { [key in keyof T]: T[key] extends IEvent<any[], any, any> ? key : never }[keyof T];

/**
 * Options for attaching events.
 * @typedef {Object} AttachEventOptions
 * @property {boolean} once - Whether the event should be triggered only once.
 */
export interface AttachEventOptions
{
    once: boolean;
}

/**
 * Represents a listener function for events.
 * @template T
 * @template TReturnType
 * @typedef {function(...T): TReturnType} Listener
 */
export type Listener<T extends readonly unknown[] = unknown[], TReturnType = void> = (...args: T) => TReturnType

/**
 * Represents a listener function for a specific event type.
 * @template T
 * @typedef {function(...TArgs): TReturnType} EventListener
 */
export type EventListener<T> = T extends IEventSink<infer TArgs, infer TReturnType, any> ? (...args: TArgs) => TReturnType : never

/**
 * Extracts the argument types of an event.
 * @template TEvent
 * @typedef {TEvent extends IEventSink<infer X, infer _Y, infer _Z> ? X : never} EventArgs
 */
export type EventArgs<TEvent> = TEvent extends IEventSink<infer X, infer _Y, infer _Z> ? X : never;

/**
 * Extracts the return type of an event.
 * @template TEvent
 * @typedef {TEvent extends IEventSink<infer _X, infer Y, infer _Z> ? Y : never} EventReturnType
 */
export type EventReturnType<TEvent> = TEvent extends IEventSink<infer _X, infer Y, infer _Z> ? Y : never;

/**
 * Extracts the options type of an event.
 * @template TEvent
 * @typedef {TEvent extends IEventSink<infer _X, infer _Y, infer Z> ? Z : never} EventOptions
 */
export type EventOptions<TEvent> = TEvent extends IEventSink<infer _X, infer _Y, infer Z> ? Z : never;

/**
 * Interface for an event sink.
 * @template T
 * @template TReturnType
 * @template TOptions
 * @interface IEventSink
 */
export interface IEventSink<T extends readonly unknown[], TReturnType, TOptions extends { once?: boolean }>
{
    maxListeners: number;
    hasListeners: boolean;
    addListener(listener: Listener<T, TReturnType>, options?: TOptions): Subscription;
    removeListener(listener?: Listener<T, TReturnType>): boolean;
    [Symbol.dispose](): void;
}

/**
 * Interface for an event.
 * @template T
 * @template TReturnType
 * @template TOptions
 * @interface IEvent
 * @extends {IEventSink<T, TReturnType, TOptions>}
 */
export type IEvent<T extends readonly unknown[], TReturnType, TOptions extends { once?: boolean } = { once?: boolean }> = IEventSink<T, TReturnType, TOptions> &
{
    emit(...args: T): TReturnType;
    pipe(event: IEvent<T, TReturnType, TOptions>): Subscription
}

/**
 * Event class to manage listeners and emit events.
 * @template T
 * @template TReturnType
 * @template TOptions
 * @extends {TeardownManager}
 * @implements {IEvent<T, TReturnType, TOptions>}
 */
export class Event<T extends readonly unknown[] = unknown[], TReturnType = void, TOptions extends { once?: boolean } = { once?: boolean }> extends AsyncTeardownManager implements IEvent<T, TReturnType, TOptions>
{
    /**
     * Combines named events into a single event.
     * @template T
     * @param {T} obj - The object containing named events.
     * @returns {IEvent<[{ [K in keyof T]: T[K] extends IEventSink<infer X, unknown, unknown> ? X : T[K] }], void>} - The combined event.
     */
    public static combineNamed<T extends { [K in keyof T]?: T[K] | IEventSink<T[K] extends unknown[] ? T[K] : [T[K]], unknown, {
        once?: boolean;
    }> }>(obj: T): IEvent<[{ [K in keyof T]: T[K] extends IEventSink<infer X, unknown, unknown> ? X : T[K] }], void>
    {
        const entries = Object.entries(obj);
        return new PipeEvent(Event.combine(...entries.map(e => e[1] as T[keyof T])), (...ev) =>
        {
            return [Object.fromEntries(entries.map((e, i) => [e[0], ev[i]])) as { [K in keyof T]: T[K] extends IEventSink<infer X, unknown, {
                once?: boolean;
            }> ? X : T[K] }];
        }, null) as any;
    }

    /**
     * Combines multiple events into a single event.
     * @template T
     * @param {...T} events - The events to combine.
     * @returns {IEventSink<T, void>} - The combined event.
     */
    public static combine<T extends unknown[]>(...events: { [K in keyof T]?: T[K] | IEventSink<T[K] extends unknown[] ? T[K] : [T[K]], unknown, {
        once?: boolean;
    }> }): IEventSink<T, void, {
        once?: boolean;
    }>
    {
        const combinedEvent = new ReplayEvent<T>(1, Event.maxListeners);
        let values: T;

        events = events.map(b => b instanceof Event ? b : new ReplayEvent(1, Event.maxListeners));

        events.forEach((event, index) =>
        {
            combinedEvent.teardown((event as Event).addListener((...ev) =>
            {
                if (!values)
                    values = [] as T;
                values[index] = ev;
                combinedEvent.emit(...values);
            }));
        });

        return combinedEvent;
    }

    /**
     * Creates an instance of Event.
     * @param {number} [maxListeners=Event.maxListeners] - The maximum number of listeners.
     * @param {(args: TReturnType[]) => TReturnType} [combineReturnTypes] - Function to combine return types.
     */
    constructor(public maxListeners = Event.maxListeners, protected readonly combineReturnTypes?: (args: TReturnType[]) => TReturnType)
    {
        super();
    }

    /**
     * Clones the event.
     * @returns {Event<T, TReturnType, TOptions>} - The cloned event.
     */
    public clone()
    {
        const result = new Event<T, TReturnType, TOptions>(this.maxListeners, this.combineReturnTypes);
        result.listeners.push(...this.listeners);
        return result;
    }

    public static maxListeners = 10;

    protected readonly listeners: Listener<T, TReturnType>[] = []

    /**
     * Checks if the event has listeners.
     * @returns {boolean} - True if the event has listeners, false otherwise.
     */
    public get hasListeners()
    {
        return !!this.listeners.length;
    }

    /**
     * Adds a listener to the event.
     * @param {Listener<T, TReturnType>} listener - The listener to add.
     * @param {TOptions} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    addListener(listener: (...args: T) => TReturnType, options?: TOptions): Subscription
    {
        if (this.maxListeners && this.listeners.length > this.maxListeners)
            throw new Error('Possible memory leak: too many listeners are registered');
        if (options?.once)
        {
            const stopListening = this.addListener((...args) =>
            {
                stopListening();
                return listener(...args);
            })
            return stopListening;
        }
        else
            this.listeners.push(listener);
        return this.teardown(() => this.removeListener(listener));
    }

    /**
     * Removes a listener from the event.
     * @param {Listener<T, TReturnType>} listener - The listener to remove.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    removeListener(listener?: (...args: T) => TReturnType): boolean
    {
        if (typeof listener == 'undefined')
            return !this.listeners.splice(0, this.listeners.length).length;
        const indexOfListener = this.listeners.indexOf(listener);
        return indexOfListener > -1 && !!this.listeners.splice(indexOfListener, 1).length;
    }

    /**
     * Emits the event.
     * @param {...T} args - The arguments to pass to the listeners.
     * @returns {TReturnType} - The return value of the listeners.
     */
    emit(...args: T): TReturnType 
    {
        const results = this.listeners.slice(0).map(listener => listener(...args));
        if (this.combineReturnTypes)
            return this.combineReturnTypes(results);
    }

    /**
     * Pipes the event to another event or emitter.
     * @param {IEvent<T, TReturnType, TOptions>} event - The event to pipe to.
     * @returns {Subscription} - The subscription.
     */
    pipe(event: IEvent<T, TReturnType, TOptions>): Subscription
    /**
     * Pipes the event to another event or emitter.
     * @param {IEvent<T, TReturnType, TOptions>} event - The event to pipe to.
     * @returns {Subscription} - The subscription.
     */
    pipe<U extends unknown[]>(event: Listener<T, U>): IEventSink<U, TReturnType, TOptions>
    /**
     * Pipes the event to another event or emitter.
     * @param {IEvent<T, TReturnType, TOptions>} event - The event to pipe to.
     * @returns {Subscription} - The subscription.
     */
    pipe<U extends unknown[]>(event: Listener<T, U> | IEvent<T, TReturnType, TOptions>): Subscription | IEventSink<U, TReturnType, TOptions>
    {
        switch (typeof event)
        {
            case 'function':
                const mapEvent = new Event<U, TReturnType, TOptions>();
                mapEvent.teardown(this.teardown(this.addListener((...args) =>
                {
                    return mapEvent.emit(...event(...args))
                })));
                return mapEvent;

            case 'object':
                return this.addListener((...args) =>
                {
                    return event.emit(...args)
                });
            default:
                throw new Error('unsupported pipe type');
        }
    }

    /**
     * Disposes the event.
     */
    [Symbol.dispose](): void
    {
        super[Symbol.dispose]();
        this.listeners.length = 0;
    }
}


/**
 * PipeEvent class to map and pipe events.
 * @template T
 * @template U
 * @template TReturnType
 * @template TOptions
 * @extends {Event<U, TReturnType, TOptions>}
 */
export class PipeEvent<T extends unknown[], U extends unknown[], TReturnType, TOptions extends { once?: boolean }> extends Event<U, TReturnType, TOptions>
{
    protected subscription: ReturnType<IEventSink<T, TReturnType, TOptions>['addListener']>;

    /**
     * Creates an instance of PipeEvent.
     * @param {IEventSink<T, TReturnType, TOptions>} source - The source event sink.
     * @param {(...args: T) => U} map - Function to map arguments.
     * @param {(results: TReturnType[]) => TReturnType} combineResults - Function to combine return types.
     */
    constructor(protected readonly source: IEventSink<T, TReturnType, TOptions>, private readonly map: (...args: T) => U, combineResults: (results: TReturnType[]) => TReturnType)
    {
        super(source.maxListeners, combineResults);
    }

    /**
     * Subscribes to the source event if required.
     */
    protected subscribeToSourceIfRequired()
    {
        if (!this.subscription)
            this.subscription = this.source.addListener((...args) => super.emit(...this.map(...args)));
    }

    /**
     * Adds a listener to the pipe event.
     * @param {Listener<U, TReturnType>} listener - The listener to add.
     * @param {TOptions} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    addListener(listener: (...args: U) => TReturnType, options?: TOptions): () => boolean
    {
        this.subscribeToSourceIfRequired();
        return super.addListener(listener, options);
    }

    /**
     * Removes a listener from the pipe event.
     * @param {Listener<U, TReturnType>} listener - The listener to remove.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    removeListener(listener: (...args: U) => TReturnType): boolean
    {
        const result = super.removeListener(listener);
        if (result && !this.hasListeners && this.subscription)
        {
            this.subscription();
            this.subscription = null;
        }
        return result;
    }

    // public pipe<V extends unknown[]>(map: (...args: U) => V)
    // {
    //     return new PipeEvent(this, map, this.combineReturnTypes);
    // }
}

/**
 * ReplayEvent class to manage events with a buffer.
 * @template T
 * @template TReturnType
 * @extends {Event<T, TReturnType>}
 */
export class ReplayEvent<T extends unknown[], TReturnType = void> extends Event<T, TReturnType>
{
    private readonly buffer: T[] = [];

    /**
     * Creates an instance of ReplayEvent.
     * @param {number} bufferLength - The length of the buffer.
     * @param {number} maxListeners - The maximum number of listeners.
     * @param {(args: TReturnType[]) => TReturnType} [combineReturnTypes] - Function to combine return types.
     */
    constructor(private readonly bufferLength: number, maxListeners?: number, combineReturnTypes?: (args: TReturnType[]) => TReturnType)
    {
        super(maxListeners, combineReturnTypes);
    }

    /**
     * Emits the event and stores the arguments in the buffer.
     * @param {...T} args - The arguments to pass to the listeners.
     * @returns {TReturnType} - The return value of the listeners.
     */
    emit(...args: T): TReturnType
    {
        this.buffer.push(args);
        while (this.buffer.length > this.bufferLength)
            this.buffer.shift();
        return super.emit(...args);
    }

    /**
     * Adds a listener to the event and replays the buffered events.
     * @param {Listener<T, TReturnType>} listener - The listener to add.
     * @param {{ once?: boolean }} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    addListener(listener: (...args: T) => TReturnType, options?: { once?: boolean; }): () => boolean
    {
        if (options?.once && this.buffer.length > 0)
        {
            listener(...this.buffer[0]);
            return () => true;
        }
        this.buffer.forEach(args => listener(...args));
        return super.addListener(listener, options);
    }

    // public pipe<U extends unknown[]>(map: (...args: T) => U)
    // {
    //     return new PipeEvent(this, map, noop);
    // }
}
