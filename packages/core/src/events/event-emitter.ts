import { Subscription, TeardownManager } from "../teardown-manager.js";
import { AllEventKeys, EventBus, SpecialEvents } from "./event-bus.js";
import { AsEvent, Event, EventArgs, EventKeys, EventListener, EventOptions, EventReturnType } from "./shared.js";

type EventMap<T extends object> = { [key in EventKeys<T>]: AsEvent<T[key]> }

type AllEvents<T extends object> = EventMap<T> & SpecialEvents

/**
 * EventEmitter class to manage events and listeners.
 * @template T
 * @implements {Disposable}
 */
export class EventEmitter<T extends object = Record<string, Event<unknown[]>>> extends TeardownManager implements EventBus<T>
{
    /**
     * Checks if there are listeners for a given event.
     * @template TKey
     * @param {TKey} name - The name of the event.
     * @returns {boolean} - True if there are listeners, false otherwise.
     */
    hasListener<const TKey extends AllEventKeys<T>>(name: TKey): boolean
    {
        return this.events[name] && this.events[name].hasListeners
    }

    // protected readonly specialEvents: Partial<SpecialEvents> = {}
    protected readonly events: AllEvents<T> = {} as AllEvents<T>;
    public maxListeners = Event.maxListeners;

    /**
     * Gets the defined events.
     * @returns {AllEventKeys<T>[]} - An array of defined event names.
     */
    public get definedEvents(): AllEventKeys<T>[] { return Object.keys(this.events) as AllEventKeys<T>[]; }

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
        return new Event(this.maxListeners) as unknown as AllEvents<T>[TEvent];
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
            this.events[event] = new Event(maxListeners) as unknown as AllEvents<T>[TEvent];
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
        for (const prop in this.events)
        {
            if (this.events[prop][Symbol.dispose])
                this.events[prop][Symbol.dispose]();
        }
    }
}
