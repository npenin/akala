import { Event, IEventSink, PipeEvent, ReplayEvent } from "../event-emitter.js";

function noop() { }


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
            this.subscription = this.source.addListener((...args: T) =>
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