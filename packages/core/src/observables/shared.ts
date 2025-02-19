import { Event, IEventSink } from "../event-emitter.js";

function noop() { }

export class PipeEvent<T extends unknown[], U extends unknown[], TReturnType, TOptions extends { once?: boolean }> extends Event<U, TReturnType, TOptions>
{
    protected subscription: ReturnType<IEventSink<T, TReturnType, TOptions>['addListener']>;

    constructor(protected readonly source: IEventSink<T, TReturnType, TOptions>, private readonly map: (...args: T) => U, combineResults: (results: TReturnType[]) => TReturnType)
    {
        super(source.maxListeners, combineResults);
    }

    protected subscribeToSourceIfRequired()
    {
        if (!this.subscription)
            this.subscription = this.source.addListener((...args) => super.emit(...this.map(...args)));
    }

    addListener(listener: (...args: U) => TReturnType, options?: TOptions): () => boolean
    {
        this.subscribeToSourceIfRequired();
        return super.addListener(listener, options);
    }

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

    // public pipe<V extends unknown[]>(map: (...args: U) => V,)
    // {
    //     return new PipeEvent(this, map, this.combineReturnTypes);
    // }
}

export class ReplayEvent<T extends unknown[], TReturnType> extends Event<T, TReturnType>
{
    private buffer: T[];

    constructor(private bufferLength: number, maxListeners: number, combineReturnTypes?: (args: TReturnType[]) => TReturnType)
    {
        super(maxListeners, combineReturnTypes);
    }

    emit(...args: T): TReturnType
    {
        this.buffer.push(args);
        while (this.buffer.length > this.bufferLength)
            this.buffer.shift();
        return super.emit(...args);
    }

    addListener(listener: (...args: T) => TReturnType, options?: { once?: boolean; }): () => boolean
    {
        if (options.once && this.buffer.length > 0)
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

export class ReplayAsyncEvent<T extends unknown[], TReturnType> extends ReplayEvent<T, Promise<TReturnType>>
{
    constructor(bufferLength: number, maxListeners: number, combineReturnTypes: Event<T, TReturnType>['combineReturnTypes'])
    {
        super(bufferLength, maxListeners, (promises) => Promise.all(promises).then((returns) => combineReturnTypes(returns)));
    }

}

export class ValuedEvent<T extends unknown[], TReturnType, TOptions extends { once?: boolean }> implements IEventSink<T, TReturnType, TOptions>
{
    constructor(private value: T)
    {

    }
    hasListeners: boolean = false;

    maxListeners: number = Number.POSITIVE_INFINITY;
    addListener(listener: (...args: T) => void): () => boolean
    {
        listener(...this.value);
        return () => true;
    }
    removeListener(): boolean
    {
        return false;
    }
    [Symbol.dispose](): void
    {
        this.value = null;
    }

}

export function of<T extends unknown[]>(...args: T)
{
    return new ValuedEvent(args);
}

export class DebounceEvent<T extends unknown[], TOptions extends { once?: boolean }> extends PipeEvent<T, T, void, TOptions>
{
    constructor(source: IEventSink<T, void, TOptions>, private duration: number)
    {
        super(source, (...args) => args, noop);
    }

    protected subscribeToSourceIfRequired()
    {
        let timeout: ReturnType<typeof setTimeout>;
        if (!this.subscription)
            this.subscription = this.source.addListener((...args) =>
            {
                if (timeout)
                    clearTimeout(timeout);
                timeout = setTimeout(() => super.emit(...args), this.duration);
            });
    }
}
export function debounce<T extends unknown[], TOptions extends { once?: boolean }>(source: IEventSink<T, void, TOptions>, duration: number)
{
    return new DebounceEvent(source, duration);
}

export function pipe<T extends unknown[], U extends unknown[], TOptions extends { once?: boolean }>(source: IEventSink<T, void, TOptions>, map: (...args: T) => U)
{
    return new PipeEvent(source, map, noop);
}