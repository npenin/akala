import { Deferred } from '@akala/json-rpc-ws';
import { isArrayLike } from './each.js';
import { isPromiseLike } from './helpers.js'

export type NextFunction<TError = unknown, T extends unknown[] = [], TReturn = void> = (error?: TError, ...args: T) => TReturn;
export type SimpleNextFunction<T> = NextFunction<T, [], void | Promise<void>>

export function array<T, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction<unknown, U>) => void | PromiseLike<void>, complete: NextFunction<unknown, U, void | Promise<void>>, waitForPrevious: boolean): Promise<void> | void
{
    const promises: PromiseLike<unknown>[] = [];
    const deferred = new Deferred<void>();
    function loop(i)
    {
        if (i == array.length)
            return Promise.all(promises).then(() => complete && (complete as SimpleNextFunction<unknown>)()).then((res) => { deferred.resolve(); return res }, err => deferred.reject(err));
        else
            try
            {
                const promise = body(array[i], i, function (error?, ...args: U)
                {
                    if (error)
                        complete(error, ...args);
                    else
                        setImmediate(loop, i + 1)
                });
                if (promise && isPromiseLike(promise))
                {
                    if (!waitForPrevious)
                    {
                        promises.push(promise);
                        setImmediate(loop, i + 1);
                    }
                    else
                        promise.then(() => setImmediate(loop, i + 1), complete as SimpleNextFunction<unknown>);
                }
            }
            catch (e)
            {
                (complete as SimpleNextFunction<unknown>)(e);
            }
    }
    loop(0);
    return deferred;
}

export function object<T, U extends unknown[] = []>(o: T, body: (element: T[keyof T], i: keyof T, next?: NextFunction<unknown, U, void>) => void, complete: NextFunction<unknown, U, void | Promise<void>>, waitForPrevious: boolean): void | Promise<void>
{
    if (typeof waitForPrevious == 'undefined')
        waitForPrevious = true;
    return array<keyof T, U>(Object.keys(o) as (keyof T)[], (key, i, next) => body(o[key], key, next), complete, waitForPrevious);
}

export function each<T, TError, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i?: number, next?: NextFunction<TError, U>) => PromiseLike<void>, complete: NextFunction, waitForPrevious?: boolean): void
export function each<T, TError, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i?: number, next?: NextFunction<TError, U>) => PromiseLike<void>, waitForPrevious?: boolean): PromiseLike<void>
export function each<T, TError, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction<TError, U>) => void, complete: NextFunction, waitForPrevious?: boolean): void
export function each<TError, U extends unknown[]>(o: Record<string, unknown>, body: (element: unknown, i: string, next: NextFunction<TError, U>) => void, complete: NextFunction, waitForPrevious?: boolean): void
export function each<T, TError, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction<TError, U>) => void, waitForPrevious?: boolean): PromiseLike<void>
export function each<TError, U extends unknown[]>(o: Record<string, unknown>, body: (element: unknown, i: string, next: NextFunction<TError, U>) => void, waitForPrevious?: boolean): PromiseLike<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function each(it: unknown[] | ArrayLike<unknown> | Record<string, unknown>, body: <TError, U extends unknown[]>(element: unknown, i: any, next: NextFunction<TError, U>) => void, complete?: NextFunction | boolean, waitForPrevious?: boolean): void | PromiseLike<void>
{
    if (typeof complete === 'boolean')
    {
        waitForPrevious = complete;
        complete = undefined;
    }

    if (typeof waitForPrevious === 'undefined')
        waitForPrevious = true;


    if (typeof complete !== 'boolean')
    {
        if (isArrayLike(it))
            return array(it, body, complete, waitForPrevious);
        return object(it, body, complete, waitForPrevious);

    }
    else
    {
        return new Promise((resolve, reject) =>
        {
            if (Array.isArray(it) || isArrayLike(it))
                return array<unknown, []>(it, body, function (err)
                {
                    if (err)
                        reject(err);
                    else
                        resolve();
                }, waitForPrevious);
            return object<Record<string, unknown>, []>(it, body, function (err)
            {
                if (err)
                    reject(err);
                else
                    resolve();
            }, waitForPrevious);
        })
    }
}


export async function map<T, U>(array: T[] | ArrayLike<T>, body: (element: T, i?: number) => PromiseLike<U>, waitForPrevious?: boolean): Promise<U[]>
export async function map<T extends Record<string, unknown>, U>(o: T, body: (element: unknown, i: keyof T) => PromiseLike<U>, waitForPrevious?: boolean): Promise<U[]>
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export async function map<U>(it: any, body: (element: any, i: any) => PromiseLike<U>, waitForPrevious?: boolean): Promise<U[]>
{
    const promises: PromiseLike<U>[] = [];
    return each(it, async (el, i) =>
    {
        promises.push(body(el, i));
    }, waitForPrevious).then(() => Promise.all(promises))
}