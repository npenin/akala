import { map as mapAsync } from "./eachAsync.js";
import { Subscription, TeardownManager } from "./teardown-manager.js";

function noop() { }

/**
 * Represents special events with a dispose symbol.
 * @typedef {Object} SpecialEvents
 * @property {Event<[]>} [Symbol.dispose] - The dispose event.
 */
export type SpecialEvents = { [Symbol.dispose]: Event<[]> }

/**
 * Extracts the keys of events from an object.
 * @template T
 * @typedef {Object} EventKeys
 * @property {keyof T} key - The key of the event.
 */
export type EventKeys<T extends object> = { [key in keyof T]: T[key] extends IEvent<unknown[], unknown, unknown> ? key : never }[keyof T];

type EventMap<T extends object> = { [key in EventKeys<T>]: AsEvent<T[key]> }

/**
 * Represents all event keys, including special events.
 * @template T
 * @typedef {EventKeys<T> | keyof SpecialEvents} AllEventKeys
 */
export type AllEventKeys<T extends object> = EventKeys<T> | keyof SpecialEvents;
type AllEvents<T extends object> = EventMap<T> & SpecialEvents

/**
 * EventEmitter class to manage events and listeners.
 * @template T
 * @implements {Disposable}
 */
export class EventEmitter<T extends object = Record<string, Event<unknown[]>>> extends TeardownManager implements Disposable
{
    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends AllEventKeys<T>>(name: TKey)
    {
        return this.events[name] && this.events[name].hasListeners
    }

    // protected readonly specialEvents: Partial<SpecialEvents> = {}
    protected readonly events: AllEvents<T> = {} as AllEvents<T>;
    public maxListeners = Event.maxListeners;

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    public get definedEvents() { return Object.keys(this.events); }

    /**
     * Creates an instance of EventEmitter.
     * @param {number | T} [init] - Initial value or number of max listeners.
     */
    constructor(init?: number | T)
    {
        super();
        switch (typeof init)
        {
            case 'number':
                this.maxListeners = init;
                break;
            case 'object':
                this.events = init as AllEvents<T>;
                break;
            case 'undefined':
                break;
            default:
                throw new Error('Unsupported usage')
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected eventFactory<const TEvent extends keyof AllEvents<T>>(_name: TEvent): AllEvents<T>[TEvent]
    {
        return new Event(this.maxListeners, noop) as unknown as AllEvents<T>[TEvent];
    }

    /**
     * Sets an asynchronous event.
     * @template TEvent
     * @param {TEvent} event - The event to set.
     */
    public setAsync<const TEvent extends keyof AllEvents<T>>(event: TEvent)
    {
        if (!(event in this.events))
            this.events[event] = new AsyncEvent(this.maxListeners, noop) as unknown as AllEvents<T>[TEvent];
        else
        {
            if (!this.events[event].hasListeners)
                this.events[event] = new AsyncEvent(this.events[event].maxListeners, noop) as unknown as AllEvents<T>[TEvent];
            else
                throw new Error('This event (' + event.toString() + ') already has registered listeners, the type cannot be changed');
        }
    }

    /**
     * Sets an event.
     * @template TEvent
     * @param {TEvent} eventName - The name of the event.
     * @param {AllEvents<T>[TEvent]} event - The event to set.
     */
    public set<const TEvent extends EventKeys<T>>(eventName: TEvent, event: AllEvents<T>[TEvent])
    {
        if (!(eventName in this.events) || !this.events[eventName].hasListeners)
            this.events[eventName] = event //as EventMap<AllEvents<T>>[TEvent];
        else
            throw new Error('This event (' + event.toString() + ') already has registered listeners, the type cannot be changed');
    }

    /**
     * Gets an event.
     * @template TEvent
     * @param {TEvent} eventName - The name of the event.
     * @returns {AllEvents<T>[TEvent]} - The event.
     */
    public get<const TEvent extends EventKeys<T>>(eventName: TEvent): AllEvents<T>[TEvent]
    {
        return this.events[eventName];// = event //as EventMap<AllEvents<T>>[TEvent];
    }

    /**
     * Gets or creates an event.
     * @template TEvent
     * @param {TEvent} eventName - The name of the event.
     * @returns {AllEvents<T>[TEvent]} - The event.
     */
    public getOrCreate<const TEvent extends EventKeys<T>>(eventName: TEvent): AllEvents<T>[TEvent]
    {
        return this.events[eventName] || (this.events[eventName] = this.eventFactory(eventName));
        ;// = event //as EventMap<AllEvents<T>>[TEvent];
    }

    /**
     * Sets the maximum number of listeners for an event.
     * @template TEvent
     * @param {number} maxListeners - The maximum number of listeners.
     * @param {TEvent} [event] - The event to set the max listeners for.
     */
    public setMaxListeners<const TEvent extends AllEventKeys<T>>(maxListeners: number, event?: TEvent)
    {
        if (!(event in this.events))
            this.events[event] = new Event(maxListeners, noop) as unknown as AllEvents<T>[TEvent];
        else
            this.events[event].maxListeners = maxListeners
    }

    /**
     * Emits an event.
     * @template TEvent
     * @param {TEvent} event - The event to emit.
     * @param {...EventArgs<T[TEvent]>} args - The arguments to pass to the event listeners.
     * @returns {false | EventReturnType<T[TEvent]>} - The return value of the event listeners or false if the event does not exist.
     */
    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): false | EventReturnType<T[TEvent]>
    {
        if (!(event in this.events))
            return false
        return this.events[event].emit(...args) as EventReturnType<T[TEvent]>;
    }

    /**
     * Adds a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {EventOptions<AllEvents<T>[TEvent]>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    on<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: EventOptions<AllEvents<T>[TEvent]>): Subscription
    {
        if (!(event in this.events))
            this.events[event] = this.eventFactory(event);
        return this.events[event].addListener(handler, options);
    }

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    once<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>): Subscription
    {
        return this.on<TEvent>(event, handler, (options ? { once: true, ...options } : { once: true }) as EventOptions<AllEvents<T>[TEvent]>);
    }

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>): boolean
    {
        if (!(event in this.events))
            return false
        return this.events[event].removeListener(handler);
    }

    /**
     * Disposes the event emitter.
     */
    [Symbol.dispose]()
    {
        if (this.events[Symbol.dispose])
            this.events[Symbol.dispose].emit();
        super[Symbol.dispose]();
        for (var prop in this.events)
        {
            if (this.events[prop][Symbol.dispose])
                this.events[prop][Symbol.dispose]();
        }
    }
}

/**
 * Wrapper class for EventEmitter to manage subscriptions.
 * @template T
 * @implements {Disposable}
 */
export class EventEmitterWrapper<T extends object = Record<string, Event<unknown[]>>> implements Disposable
{
    constructor(private emitter: EventEmitter<T>)
    {

    }

    private subscriptions: Subscription[] = []

    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends AllEventKeys<T>>(name: TKey): boolean
    {
        return this.emitter.hasListener(name);
    }

    /**
     * Gets the maximum number of listeners.
     * @returns {number} - The maximum number of listeners.
     */
    public get maxListeners(): number { return this.emitter.maxListeners };

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    public get definedEvents(): string[]
    {
        return this.emitter.definedEvents;
    }

    /**
     * Sets an asynchronous event.
     * @template TEvent
     * @param {TEvent} event - The event to set.
     */
    public setAsync<const TEvent extends typeof Symbol.dispose | EventKeys<T>>(event: TEvent): void
    {
        this.emitter.setAsync(event);
    }

    /**
     * Sets an event.
     * @template TEvent
     * @param {TEvent} eventName - The name of the event.
     * @param {AllEvents<T>[TEvent]} event - The event to set.
     */
    public set<const TEvent extends EventKeys<T>>(eventName: TEvent, event: AllEvents<T>[TEvent]): void
    {
        this.emitter.set(eventName, event);
    }

    /**
     * Sets the maximum number of listeners for an event.
     * @template TEvent
     * @param {number} maxListeners - The maximum number of listeners.
     * @param {TEvent} [event] - The event to set the max listeners for.
     */
    public setMaxListeners<const TEvent extends AllEventKeys<T>>(maxListeners: number, event?: TEvent): void
    {
        this.emitter.setMaxListeners(maxListeners, event);
    }

    /**
     * Emits an event.
     * @template TEvent
     * @param {TEvent} event - The event to emit.
     * @param {...EventArgs<T[TEvent]>} args - The arguments to pass to the event listeners.
     * @returns {false | EventReturnType<T[TEvent]>} - The return value of the event listeners or false if the event does not exist.
     */
    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): false | EventReturnType<T[TEvent]>
    {
        return this.emitter.emit(event, ...args);
    }

    /**
     * Adds a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {EventOptions<AllEvents<T>[TEvent]>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    on<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: EventOptions<AllEvents<T>[TEvent]>): Subscription
    {
        const sub = this.emitter.on(event, handler, options);
        this.subscriptions.push(sub);
        return sub;
    }

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, "once">} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    once<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: Omit<EventOptions<AllEvents<T>[TEvent]>, "once">): Subscription
    {
        const sub = this.emitter.once(event, handler, options);
        this.subscriptions.push(sub);
        return sub;
    }

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>): boolean
    {
        return this.emitter.off(event, handler);
    }

    /**
     * Disposes the event emitter wrapper.
     */
    [Symbol.dispose](): void
    {
        this.subscriptions.forEach(s => s());
    }

}

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
 * Converts a type to an event type.
 * @template T
 * @typedef {IEvent<TArgs, TReturnType, TOptions>} AsEvent
 */
export type AsEvent<T> = T extends IEventSink<infer TArgs, infer TReturnType, infer TOptions> ? IEvent<TArgs, TReturnType, TOptions> : never;

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
export type EventListener<T extends IEventSink<readonly unknown[], unknown, any>> = T extends IEventSink<infer TArgs, infer TReturnType, any> ? (...args: TArgs) => TReturnType : never

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
export interface IEventSink<T extends readonly unknown[], TReturnType, TOptions extends { once?: boolean } = { once?: boolean }>
{
    maxListeners: number;
    hasListeners: boolean;
    addListener(listener: EventListener<IEventSink<T, TReturnType, TOptions>>, options?: TOptions): Subscription;
    removeListener(listener: EventListener<IEventSink<T, TReturnType, TOptions>>): boolean;
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
export class Event<T extends readonly unknown[] = unknown[], TReturnType = void, TOptions extends { once?: boolean } = { once?: boolean }> extends TeardownManager implements IEvent<T, TReturnType, TOptions>
{
    /**
     * Combines named events into a single event.
     * @template T
     * @param {T} obj - The object containing named events.
     * @returns {IEvent<[{ [K in keyof T]: T[K] extends IEventSink<infer X, unknown, unknown> ? X : T[K] }], void>} - The combined event.
     */
    public static combineNamed<T extends { [K in keyof T]?: T[K] | IEventSink<T[K] extends unknown[] ? T[K] : [T[K]], unknown> }>(obj: T): IEvent<[{ [K in keyof T]: T[K] extends IEventSink<infer X, unknown, unknown> ? X : T[K] }], void>
    {
        const entries = Object.entries(obj);
        return new PipeEvent(Event.combine(...entries.map(e => e[1] as T[keyof T])), (...ev) =>
        {
            return [Object.fromEntries(entries.map((e, i) => [e[0], ev[i]])) as { [K in keyof T]: T[K] extends IEventSink<infer X, unknown> ? X : T[K] }];
        }, null) as any;
    }

    /**
     * Combines multiple events into a single event.
     * @template T
     * @param {...T} events - The events to combine.
     * @returns {IEventSink<T, void>} - The combined event.
     */
    public static combine<T extends unknown[]>(...events: { [K in keyof T]?: T[K] | IEventSink<T[K] extends unknown[] ? T[K] : [T[K]], unknown> }): IEventSink<T, void>
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
        return () => this.removeListener(listener);
    }

    /**
     * Removes a listener from the event.
     * @param {Listener<T, TReturnType>} listener - The listener to remove.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    removeListener(listener: (...args: T) => TReturnType): boolean
    {
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
        const results = this.listeners.map(listener => listener(...args));
        if (this.combineReturnTypes)
            return this.combineReturnTypes(results);
    }

    /**
     * Pipes the event to another event or emitter.
     * @template U
     * @template V
     * @param {U | IEvent<T, TReturnType, TOptions>} event - The event to pipe to.
     * @param {EventEmitter<V>} [emitter] - The emitter to pipe to.
     * @returns {Subscription} - The subscription.
     */
    pipe<const U extends string | symbol, V extends { [key in U]: IEvent<T, TReturnType, TOptions> }>(event: U, emitter: EventEmitter<V>): Subscription
    pipe(event: IEvent<T, TReturnType, TOptions>): Subscription
    pipe<const U extends EventKeys<V>, V extends { [key in U]: IEvent<T, TReturnType, TOptions> }>(event: (U) | IEvent<T, TReturnType, TOptions>, emitter?: EventEmitter<V>): Subscription
    {
        switch (typeof event)
        {
            case 'object':
                return this.addListener((...args) =>
                {
                    return event.emit(...args)
                });
            case 'string':
            case 'symbol':
                return this.addListener((...args) =>
                {
                    return (emitter.emit(event, ...args as EventArgs<V[U]>) || null) as TReturnType
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
        this.listeners.length = 0;
    }
}

/**
 * AsyncEvent class to manage asynchronous events.
 * @template T
 * @template TReturnType
 * @extends {Event<T, TReturnType | Promise<TReturnType>>}
 */
export class AsyncEvent<T extends unknown[] = unknown[], TReturnType = void> extends Event<T, TReturnType | Promise<TReturnType>>
{
    /**
     * Creates an instance of AsyncEvent.
     * @param {number} [maxListeners=10] - The maximum number of listeners.
     * @param {(args: TReturnType[]) => TReturnType} combineReturnTypes - Function to combine return types.
     */
    constructor(maxListeners = 10, combineReturnTypes: Event<T, TReturnType>['combineReturnTypes'])
    {
        super(maxListeners, (promises) => Promise.all(promises).then((returns) => combineReturnTypes(returns)))
    }

    /**
     * Adds a listener to the asynchronous event.
     * @param {Listener<T, TReturnType | Promise<TReturnType>>} listener - The listener to add.
     * @param {{ once?: boolean }} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    addListener(listener: Listener<T, TReturnType | Promise<TReturnType>>, options?: { once?: boolean })
    {
        if (options?.once)
        {
            const stopListening = super.addListener(async (...args) =>
            {
                try
                {
                    return await listener(...args);
                }
                finally
                {
                    stopListening();
                }
            })
            return stopListening;
        }
        else
            return super.addListener(listener);
    }

    /**
     * Emits the asynchronous event.
     * @param {...T} args - The arguments to pass to the listeners.
     * @returns {Promise<TReturnType>} - The return value of the listeners.
     */
    async emit(...args: T): Promise<TReturnType>
    {
        return this.combineReturnTypes(await mapAsync(this.listeners, async listener => await listener(...args), true))
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
    private buffer: T[] = [];

    /**
     * Creates an instance of ReplayEvent.
     * @param {number} bufferLength - The length of the buffer.
     * @param {number} maxListeners - The maximum number of listeners.
     * @param {(args: TReturnType[]) => TReturnType} [combineReturnTypes] - Function to combine return types.
     */
    constructor(private bufferLength: number, maxListeners: number, combineReturnTypes?: (args: TReturnType[]) => TReturnType)
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


export default EventEmitter;
