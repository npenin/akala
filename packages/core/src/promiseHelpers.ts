import { EventEmitter } from 'events'
export function Promisify<T>(o: T): PromiseLike<T>
{
    if (o && o instanceof Promise)
        return o;
    if (o && o['then'])
        return <PromiseLike<T>><any>o;

    return Promise.resolve(o);
}

export type ResolveHandler<T, TResult> = (value: T) => TResult | PromiseLike<TResult>
export type RejectHandler<TResult> = (reason: any) => void | TResult | PromiseLike<TResult>;

export function isPromiseLike<T>(o: T | PromiseLike<T>): o is PromiseLike<T>
{
    return o && o['then'] && typeof (o['then']) == 'function';
}

export function when<T>(promises: PromiseLike<T>[]): PromiseLike<T[]>
{
    return Promise.all(promises);
}

export enum PromiseStatus
{
    Pending = 0,
    Resolved = 1,
    Rejected = 2
}