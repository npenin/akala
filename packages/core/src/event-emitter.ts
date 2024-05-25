import { map as mapAsync } from "./eachAsync.js";

function noop() { }

export type SpecialEvents = { [Symbol.dispose]: Event<[]> }
export type Subscription = () => boolean
export type EventKeys<T extends object> = { [key in keyof T]: T[key] extends IEvent<unknown[], unknown, unknown> ? key : never }[keyof T];

type EventMap<T extends object> = { [key in EventKeys<T>]: AsEvent<T[key]> }
export type AllEventKeys<T extends object> = EventKeys<T> | keyof SpecialEvents;
type AllEvents<T extends object> = EventMap<T> & SpecialEvents

export class EventEmitter<T extends object = Record<string, Event<unknown[]>>>
{
    hasListener<const TKey extends EventKeys<T & SpecialEvents>>(name: TKey)
    {
        return this.events[name] && this.events[name].hasListeners
    }

    // protected readonly specialEvents: Partial<SpecialEvents> = {}
    protected readonly events: AllEvents<T> = {} as AllEvents<T>;
    public maxListeners = Event.maxListeners;

    public get definedEvents() { return Object.keys(this.events); }

    constructor(init?: number | T)
    {
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

    protected eventFactory<const TEvent extends keyof AllEvents<T>>(_name: TEvent): AllEvents<T>[TEvent]
    {
        return new Event(this.maxListeners, noop) as unknown as AllEvents<T>[TEvent];
    }

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

    public set<const TEvent extends EventKeys<T>>(eventName: TEvent, event: AllEvents<T>[TEvent])
    {
        if (!(eventName in this.events) || !this.events[eventName].hasListeners)
            this.events[eventName] = event //as EventMap<AllEvents<T>>[TEvent];
        else
            throw new Error('This event (' + event.toString() + ') already has registered listeners, the type cannot be changed');
    }

    public setMaxListeners<const TEvent extends AllEventKeys<T>>(maxListeners: number, event?: TEvent)
    {
        if (!(event in this.events))
            this.events[event] = new Event(maxListeners, noop) as unknown as AllEvents<T>[TEvent];
        else
            this.events[event].maxListeners = maxListeners
    }

    emit<const TEvent extends EventKeys<T>>(event: TEvent, ...args: EventArgs<T[TEvent]>): false | EventReturnType<T[TEvent]>
    {
        if (!(event in this.events))
            return false
        return this.events[event].emit(...args) as EventReturnType<T[TEvent]>;
    }

    on<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: EventOptions<AllEvents<T>[TEvent]>): Subscription
    {
        if (!(event in this.events))
            this.events[event] = this.eventFactory(event);
        return this.events[event].addListener(handler, options);
    }

    once<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>, options?: Omit<EventOptions<AllEvents<T>[TEvent]>, 'once'>): Subscription
    {
        return this.on<TEvent>(event, handler, (options ? { once: true, ...options } : { once: true }) as EventOptions<AllEvents<T>[TEvent]>);
    }

    // off<const TEvent extends keyof T>(event: TEvent, handler: EventListener<T[TEvent]>): boolean
    // off<const TEvent extends keyof SpecialEvents>(event: TEvent, handler: EventListener<SpecialEvents[TEvent]>): boolean
    // off<const TEvent extends ((keyof T) | keyof SpecialEvents)>(event: TEvent, handler: TEvent extends keyof T ? EventListener<T[TEvent]> : TEvent extends keyof SpecialEvents ? EventListener<SpecialEvents[TEvent]> : never): boolean
    off<const TEvent extends AllEventKeys<T>>(event: TEvent, handler: EventListener<AllEvents<T>[TEvent]>): boolean
    {
        if (!(event in this.events))
            return false
        return this.events[event].removeListener(handler);
    }

    [Symbol.dispose]()
    {
        if (this.events[Symbol.dispose])
            this.events[Symbol.dispose].emit();
        for (var prop in this.events)
        {
            if (this.events[prop][Symbol.dispose])
                this.events[prop][Symbol.dispose]();
        }
    }
}

export interface AttachEventOptions
{
    once: boolean;
}

export type AsEvent<T> = T extends IEventSink<infer TArgs, infer TReturnType, infer TOptions> ? IEvent<TArgs, TReturnType, TOptions> : never;
export type Listener<T extends readonly unknown[] = unknown[], TReturnType = void> = (...args: T) => TReturnType
export type EventListener<T extends IEventSink<readonly unknown[], unknown, any>> = T extends IEventSink<infer TArgs, infer TReturnType, any> ? (...args: TArgs) => TReturnType : never
export type EventArgs<TEvent> = TEvent extends IEventSink<infer X, infer _Y, infer _Z> ? X : never;
export type EventReturnType<TEvent> = TEvent extends IEventSink<infer _X, infer Y, infer _Z> ? Y : never;
export type EventOptions<TEvent> = TEvent extends IEventSink<infer _X, infer _Y, infer Z> ? Z : never;

export interface IEventSink<T extends readonly unknown[], TReturnType, TOptions extends { once?: boolean } = { once?: boolean }>
{
    maxListeners: number;
    hasListeners: boolean;
    addListener(listener: EventListener<IEventSink<T, TReturnType, TOptions>>, options?: TOptions): Subscription;
    removeListener(listener: EventListener<IEventSink<T, TReturnType, TOptions>>): boolean;
    [Symbol.dispose](): void;
}

export type IEvent<T extends readonly unknown[], TReturnType, TOptions extends { once?: boolean } = { once?: boolean }> = IEventSink<T, TReturnType, TOptions> &
{
    emit(...args: T): TReturnType;
    pipe(event: IEvent<T, TReturnType, TOptions>): Subscription
}

export class Event<T extends readonly unknown[] = unknown[], TReturnType = void, TOptions extends { once?: boolean } = { once?: boolean }> implements IEvent<T, TReturnType, TOptions>
{
    constructor(public maxListeners = Event.maxListeners, protected readonly combineReturnTypes?: (args: TReturnType[]) => TReturnType)
    {

    }

    public static maxListeners = 10;

    protected readonly listeners: Listener<T, TReturnType>[] = []

    public get hasListeners()
    {
        return !!this.listeners.length;
    }

    addListener(listener: (...args: T) => TReturnType, options?: TOptions)
    {
        if (this.maxListeners && this.listeners.length > this.maxListeners)
            throw new Error('Possible memory leak: too many listeners are registered');
        if (options?.once)
        {
            const stopListening = this.addListener((...args) =>
            {
                try
                {
                    return listener(...args);
                }
                finally
                {
                    stopListening();
                }
            })
            return stopListening;
        }
        else
            this.listeners.push(listener);
        return () => this.removeListener(listener);
    }

    removeListener(listener: (...args: T) => TReturnType): boolean
    {
        const indexOfListener = this.listeners.indexOf(listener);
        return indexOfListener > -1 && !!this.listeners.splice(indexOfListener, 1).length;
    }

    emit(...args: T): TReturnType 
    {
        const results = this.listeners.map(listener => listener(...args));
        if (this.combineReturnTypes)
            return this.combineReturnTypes(results);
    }

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

    [Symbol.dispose](): void
    {
        this.listeners.length = 0;
    }
}

export class AsyncEvent<T extends unknown[] = unknown[], TReturnType = void> extends Event<T, TReturnType | Promise<TReturnType>>
{
    constructor(maxListeners = 10, combineReturnTypes: Event<T, TReturnType>['combineReturnTypes'])
    {
        super(maxListeners, (promises) => Promise.all(promises).then((returns) => combineReturnTypes(returns)))
    }

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

    async emit(...args: T): Promise<TReturnType>
    {
        return this.combineReturnTypes(await mapAsync(this.listeners, async listener => await listener(...args), true))
    }
}


export default EventEmitter;