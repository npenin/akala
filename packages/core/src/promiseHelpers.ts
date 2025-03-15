import { Event, IEventSink } from "./event-emitter.js";

export type ResolveHandler<T, TResult> = (value: T) => TResult | PromiseLike<TResult>
export type RejectHandler<TResult> = (reason: unknown) => void | TResult | PromiseLike<TResult>;

/**
 * Checks if an object is a Promise-like instance
 * @template T - The expected resolved value type
 * @param {T | PromiseLike<T>} o - The object to check
 * @returns {boolean} True if the object has a 'then' method, indicating it's Promise-like
 */
export function isPromiseLike<T>(o: T | PromiseLike<T>): o is PromiseLike<T>
{
    return o && o['then'] && typeof (o['then']) == 'function';
}

/**
 * Converts a Promise to an Event emitter that fires when the Promise resolves
 * @template T - The type of the Promise resolution value
 * @param {PromiseLike<T>} promise - The Promise to convert
 * @returns {IEventSink<[T], void, unknown>} Event emitter that will emit the resolved value
 */
export function toEvent<T>(promise: PromiseLike<T>): IEventSink<[T], void, unknown>
{
    const result = new Event<[T]>(Event.maxListeners, () => { });

    promise.then(v => { try { result.emit(v); } finally { result[Symbol.dispose]() } });

    return result;
}

/**
 * Converts an Event emitter to a Promise that resolves when the event fires
 * @template T - The type of the event payload
 * @param {IEventSink<[T], void, unknown>} event - The event emitter to convert
 * @returns {PromiseLike<T>} Promise that resolves with the first event payload
 */
export function fromEvent<T>(event: IEventSink<[T], void, unknown>): PromiseLike<T>
{
    const result = new Deferred<T>();
    event.addListener(value => result.resolve(value));
    return result;
}

/**
 * A Deferred Promise pattern implementation allowing external resolution control
 * @template T - The type of the resolved value
 * @template TError - The type of the rejection reason (defaults to Error)
 */
export class Deferred<T, TError = Error> implements PromiseLike<T>
{
    private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
    private _reject?: (reason?: TError) => void;
    promise: Promise<T>;
    /**
     * Resolves the deferred Promise with a value
     * @param {T | PromiseLike<T> | undefined} _value - The resolution value
     * @throws {Error} If called before Promise initialization
     */
    resolve(_value?: T | PromiseLike<T> | undefined): void
    {
        if (typeof (this._resolve) == 'undefined')
            throw new Error('Not Implemented');

        this._resolve(_value);
    }
    /**
     * Rejects the deferred Promise with a reason
     * @param {TError} _reason - The rejection reason
     * @throws {Error} If called before Promise initialization
     */
    reject(_reason?: TError): void
    {
        if (typeof (this._reject) == 'undefined')
            throw new Error('Not Implemented');

        this._reject(_reason);
    }
    constructor()
    {
        let _resolve;
        let _reject;
        this.promise = new Promise<T>((resolve, reject) =>
        {
            _resolve = resolve;
            _reject = reject;
        });
        this._resolve = _resolve;
        this._reject = _reject;
    }

    public then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: TError) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>
    {
        return this.promise.then(onfulfilled, onrejected);
    }
    public catch<TResult = never>(onrejected?: ((reason: TError) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>
    {
        return this.promise.catch(onrejected);
    }
    public finally(onfinally?: (() => void) | undefined | null): Promise<T>
    {
        return this.promise.finally(onfinally);
    }

    public get [Symbol.toStringTag](): string
    {
        return this.promise[Symbol.toStringTag];
    }
}

/**
 * Creates a Promise that resolves after a specified delay
 * @param {number} delay - Delay duration in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export function delay(delay: number)
{
    return new Promise((resolve) =>
    {
        setTimeout(resolve, delay);
    })
}

/**
 * Wraps a Promise with a timeout, rejecting if it doesn't resolve in time
 * @template T - The type of the original Promise resolution
 * @param {PromiseLike<T>} promise - The Promise to wrap
 * @param {number} timeoutInMs - Timeout duration in milliseconds
 * @returns {PromiseLike<T>} New Promise that either resolves with the original value or rejects with 'timeout'
 */
export function whenOrTimeout<T>(promise: PromiseLike<T>, timeoutInMs: number): PromiseLike<T>
{
    return new Promise<T>((resolve, reject) =>
    {
        const timeOut = setTimeout(function ()
        {
            reject('timeout');
        }, timeoutInMs);
        promise.then(function (data)
        {
            clearTimeout(timeOut);
            resolve(data);
        }, function (rejection)
        {
            clearTimeout(timeOut);
            reject(rejection);
        });
    })
}

/** 
 * Enum representing the possible states of a Promise
 * @enum {number}
 */
export enum PromiseStatus
{
    Pending = 0,
    Resolved = 1,
    Rejected = 2
}
