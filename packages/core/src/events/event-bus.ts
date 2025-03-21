import { Subscription, TeardownManager } from "../teardown-manager.js";
import { AsEvent, Event, EventArgs, EventKeys, EventListener, EventOptions, EventReturnType } from "./shared.js";

/**
 * Represents special events with a dispose symbol.
 * @typedef {Object} SpecialEvents
 * @property {Event<[]>} [Symbol.dispose] - The dispose event.
 */
export type SpecialEvents = { [Symbol.dispose]: Event<[]> }

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
export interface EventBus<T extends object = Record<string, Event<unknown[]>>> extends TeardownManager
{
    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends AllEventKeys<T>>(name: TKey);

    /**
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    get definedEvents(): (AllEventKeys<T>)[];

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
    on<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: EventOptions<AllEvents<T>[TEvent]>): Subscription;

    /**
     * Adds a one-time listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to listen to.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @param {Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    once<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>): Subscription;

    /**
     * Removes a listener for an event.
     * @template TEvent
     * @param {TEvent} event - The event to remove the listener from.
     * @param {EventListener<AllEvents<T>[TEvent]>} handler - The event handler.
     * @returns {boolean} - True if the listener was removed, false otherwise.
     */
    off<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>): boolean;
}


/**
 * Wrapper class for EventEmitter to manage subscriptions.
 * @template T
 * @implements {Disposable}
 */
export class EventBusWrapper<T extends object = Record<string, Event<unknown[]>>> extends TeardownManager implements EventBus<T>
{
    constructor(private readonly emitter: EventBus<T>)
    {
        super();
        emitter.once(Symbol.dispose, (() => this[Symbol.dispose]()) as EventListener<AllEvents<T>[typeof Symbol.dispose]>);
    }

    public readonly subscriptions: Subscription[] = []

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
     * Gets the defined events.
     * @returns {string[]} - An array of defined event names.
     */
    public get definedEvents(): AllEventKeys<T>[]
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
}
