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