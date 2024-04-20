export class EventEmitter<T extends { [key in keyof T]: Event<any[]> | undefined } = Record<string, Event>>
{
    events: Partial<T> = {}
    constructor(public maxListeners = 11)
    {

    }

    public setAsync<const TEvent extends keyof T>(event: TEvent)
    {
        if (!(event in this.events))
            this.events[event] = new AsyncEvent(this.maxListeners) as unknown as T[TEvent];
        else
        {
            if (!this.events[event].hasListeners)
                this.events[event] = new AsyncEvent(this.events[event].maxListeners) as unknown as T[TEvent];
            else
                throw new Error('This event (' + event.toString() + ') already has registered listeners, the type cannot be changed');
        }
    }

    public set<const TEvent extends keyof T>(eventName: TEvent, event: T[TEvent])
    {
        if (!(eventName in this.events) || !this.events[eventName].hasListeners)
            this.events[eventName] = event;
        else
            throw new Error('This event (' + event.toString() + ') already has registered listeners, the type cannot be changed');
    }

    public setMaxListeners<const TEvent extends keyof T>(maxListeners: number, event?: TEvent)
    {
        if (!(event in this.events))
            this.events[event] = new Event(maxListeners) as T[TEvent];
        else
            this.events[event].maxListeners = maxListeners
    }

    emit<const TEvent extends keyof T>(event: TEvent, ...args: EventArgs<T[TEvent]>)
    {
        if (!(event in this.events))
            return false
        return this.events[event].emit(...args);
    }

    on<const TEvent extends keyof T>(event: TEvent, handler: (...args: EventArgs<T[TEvent]>) => void, options?: AttachEventOptions)
    {
        if (!(event in this.events))
            this.events[event] = new Event(this.maxListeners) as T[TEvent];
        return this.events[event].addListener(handler, options);
    }

    once<const TEvent extends keyof T>(event: TEvent, handler: (...args: EventArgs<T[TEvent]>) => void)
    {
        return this.on(event, handler, { once: true })
    }

    off<const TEvent extends keyof T>(event: TEvent, handler: (...args: EventArgs<T[TEvent]>) => void)
    {
        if (!(event in this.events))
            return false
        return this.events[event].removeListener(handler);
    }
}

export interface AttachEventOptions
{
    once: boolean;
}

export type Listener<T extends unknown[] = unknown[], TReturnType = void> = (...args: T) => TReturnType
export type EventArgs<TEvent> = TEvent extends Event<infer X, unknown> ? X : never;

export class Event<T extends unknown[] = unknown[], TReturnType = void>
{
    constructor(public maxListeners = 11)
    {

    }

    protected readonly listeners: Listener<T, TReturnType>[] = []

    public get hasListeners()
    {
        return !!this.listeners.length;
    }

    addListener(listener: (...args: T) => TReturnType, options?: { once?: boolean })
    {
        if (this.listeners.length > this.maxListeners)
            throw new Error('Possible memory leak: too many listeners are registered');
        if (options?.once)
        {
            let stopListening = this.addListener((...args) =>
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

    emit(...args: T)
    {
        for (const listener of this.listeners)
        {
            listener(...args);
        }
    }
}

export class AsyncEvent<T extends unknown[] = unknown[]> extends Event<T, void | Promise<void>>
{
    constructor(maxListeners = 11)
    {
        super(maxListeners)
    }

    addListener(listener: Listener<T, void | Promise<void>>, options?: { once?: boolean })
    {
        if (options?.once)
        {
            let stopListening = super.addListener(async (...args) =>
            {
                try
                {
                    await listener(...args);
                }
                finally
                {
                    stopListening();
                }
            })
        }
        else
            return super.addListener(listener);
    }

    async emit(...args: T)
    {
        for (const listener of this.listeners)
        {
            await listener(...args);
        }
    }
}


export default EventEmitter;