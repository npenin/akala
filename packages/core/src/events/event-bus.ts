import { AsyncSubscription, AsyncTeardownManager, Subscription } from "../teardown-manager.js";
import { Event, EventArgs, EventKeys, EventListener, EventOptions, EventReturnType, IEvent } from "./shared.js";

/**
 * Represents special events with a dispose symbol.
 * @typedef {Object} SpecialEvents
 * @property {Event<[]>} [Symbol.dispose] - The dispose event.
 */
export type SpecialEvents = { [Symbol.dispose]: IEvent<[], void> }

export type EventMap<T extends object> = { [key in EventKeys<T>]?: T[key] }

/**
 * Represents all event keys, including special events.
 * @template T
 * @typedef {EventKeys<T> | keyof SpecialEvents} AllEventKeys
 */
export type AllEventKeys<T extends object> = EventKeys<T> | keyof SpecialEvents;

/**
 * EventBus interface to manage events and listeners.
 * @template T
 * @implements {Disposable}
 */
export interface EventBus<T extends EventMap<T> = Record<PropertyKey, IEvent<unknown[], unknown>>> extends AsyncTeardownManager
{
    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends EventKeys<T>>(name: TKey): boolean;

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    get definedEvents(): (EventKeys<T>)[];

    /**
     * Emits an event.
     * @template TEvent
     * @param {TEvent} event - The event to emit.
     * @param {...EventArgs<T[TEvent]>} args - The arguments to pass to the event listeners.
     * @returns {false | EventReturnType<T[TEvent]>} - The return value of the event listeners or false if the event does not exist.
     */
    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): false | EventReturnType<T[TEvent]>;

    /**
     * Adds a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {EventOptions<AllEvents<T>[TEvent]>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    on<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: EventOptions<T[TEvent]>): Subscription;

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    once<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: Omit<EventOptions<T[TEvent]>, 'once'>): Subscription;

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends EventKeys<T>>(event: TEvent, handler?: EventListener<T[TEvent]>): boolean;
}


/**
 * AsyncEventBus interface to manage events and listeners.
 * @template T
 * @implements {Disposable}
 */
export interface AsyncEventBus<T extends { [key in keyof T]: IEvent<unknown[], unknown> } = Record<PropertyKey, IEvent<unknown[], unknown>>> extends AsyncTeardownManager
{
    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {Promise<boolean>} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends EventKeys<T>>(name: TKey): Promise<boolean>;

    /**
     * Gets the defined events.
     * @returns {Promise<string[]>} - An array of defined event names.
     */
    get definedEvents(): Promise<(EventKeys<T>)[]>;

    /**
     * Emits an event.
     * @template TEvent
     * @param {TEvent} event - The event to emit.
     * @param {...EventArgs<T[TEvent]>} args - The arguments to pass to the event listeners.
     * @returns {Promise<false | EventReturnType<T[TEvent]>>} - The return value of the event listeners or false if the event does not exist.
     */
    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): Promise<false | EventReturnType<T[TEvent]>>;

    /**
     * Adds a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {EventOptions<AllEvents<T>[TEvent]>} [options] - The event options.
     * @returns {Promise<Subscription>} - The subscription.
     */
    on<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: EventOptions<T[TEvent]>): Promise<AsyncSubscription>;

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>} [options] - The event options.
     * @returns {Promise<Subscription>} - The subscription.
     */
    once<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: Omit<EventOptions<T[TEvent]>, 'once'>): Promise<AsyncSubscription>;

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {Promise<boolean>} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends EventKeys<T>>(event: TEvent, handler?: EventListener<T[TEvent]>): Promise<boolean>;
}


/**
 * Wrapper class for EventEmitter to manage subscriptions.
 * @template T
 * @implements {Disposable}
 */
export class EventBusWrapper<T extends Record<string, IEvent<unknown[], unknown>> = Record<string, Event<unknown[]>>> extends AsyncTeardownManager implements EventBus<T>
{
    constructor(private readonly emitter: EventBus<T>)
    {
        super();
        emitter.once(Symbol.dispose as EventKeys<T>, (() => this[Symbol.dispose]()) as EventListener<T[EventKeys<T>]>);
    }

    public readonly subscriptions: Subscription[] = []

    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends EventKeys<T>>(name: TKey): boolean
    {
        return this.emitter.hasListener(name);
    }

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    public get definedEvents(): EventKeys<T>[]
    {
        return this.emitter.definedEvents;
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
    on<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: EventOptions<T[TEvent]>): Subscription
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
    once<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: Omit<EventOptions<T[TEvent]>, "once">): Subscription
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
    off<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>): boolean
    {
        return this.emitter.off(event, handler);
    }
}


/**
 * Wrapper class to make a sync event bus async.
 * @template T
 * @implements {Disposable}
 */
export class EventBus2AsyncEventBus<T extends Record<string, IEvent<unknown[], unknown>> = Record<string, IEvent<unknown[], unknown>>> extends AsyncTeardownManager implements AsyncEventBus<T>
{
    constructor(private readonly emitter: EventBus<T>)
    {
        super();
        emitter.once(Symbol.dispose as EventKeys<T>, (() => this[Symbol.asyncDispose]()) as EventListener<T[EventKeys<T>]>);
    }

    public readonly subscriptions: Subscription[] = []

    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends EventKeys<T>>(name: TKey): Promise<boolean>
    {
        return Promise.resolve(this.emitter.hasListener(name));
    }

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    public get definedEvents(): Promise<EventKeys<T>[]>
    {
        return Promise.resolve(this.emitter.definedEvents);
    }

    /**
     * Emits an event.
     * @template TEvent
     * @param {TEvent} event - The event to emit.
     * @param {...EventArgs<T[TEvent]>} args - The arguments to pass to the event listeners.
     * @returns {false | EventReturnType<T[TEvent]>} - The return value of the event listeners or false if the event does not exist.
     */
    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): Promise<false | EventReturnType<T[TEvent]>>
    {
        return Promise.resolve(this.emitter.emit(event, ...args));
    }

    /**
     * Adds a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {EventOptions<AllEvents<T>[TEvent]>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    on<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: EventOptions<T[TEvent]>): Promise<AsyncSubscription>
    {
        const sub = this.emitter.on(event, handler, options);
        this.subscriptions.push(sub);
        return Promise.resolve(() => Promise.resolve(sub()));
    }

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, "once">} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    once<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>, options?: Omit<EventOptions<T[TEvent]>, "once">): Promise<AsyncSubscription>
    {
        const sub = this.emitter.once(event, handler, options);
        this.subscriptions.push(sub);
        return Promise.resolve(() => Promise.resolve(sub()));
    }

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends EventKeys<T>>(event: TEvent, handler: EventListener<T[TEvent]>): Promise<boolean>
    {
        return Promise.resolve(this.emitter.off(event, handler));
    }
}
