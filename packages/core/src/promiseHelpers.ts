export function Promisify<T>(o: T | PromiseLike<T>): PromiseLike<T>
{
    return Promise.resolve(o);
}

export type ResolveHandler<T, TResult> = (value: T) => TResult | PromiseLike<TResult>
export type RejectHandler<TResult> = (reason: unknown) => void | TResult | PromiseLike<TResult>;

export function isPromiseLike<T>(o: T | PromiseLike<T>): o is PromiseLike<T>
{
    return o && o['then'] && typeof (o['then']) == 'function';
}

export function when<T>(promises: PromiseLike<T>[]): PromiseLike<T[]>
{
    return Promise.all(promises);
}

export class Deferred<T, TError = Error> implements PromiseLike<T>
{
    private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
    private _reject?: (reason?: TError) => void;
    promise: Promise<T>;
    resolve(_value?: T | PromiseLike<T> | undefined): void
    {
        if (typeof (this._resolve) == 'undefined')
            throw new Error('Not Implemented');

        this._resolve(_value);
    }
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

    public then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: Error) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>
    {
        return this.promise.then(onfulfilled, onrejected);
    }
    public catch<TResult = never>(onrejected?: ((reason: Error) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>
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

export enum PromiseStatus
{
    Pending = 0,
    Resolved = 1,
    Rejected = 2
}