import { isArrayLike } from './each.js';
import { Deferred, isPromiseLike } from './helpers.js'

export type NextFunction<TError = unknown, T extends unknown[] = [], TReturn = void> = (error?: TError, ...args: T) => TReturn;
export type SimpleNextFunction<T> = NextFunction<T, [], void | Promise<void>>

export class AggregateErrors extends Error
{
    constructor(public readonly errors: Error[])
    {
        super('One or more errors occurred. Please see errors field for more details');
    }
}

export function array<T, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction<unknown, U>) => void | PromiseLike<void>, complete: NextFunction<Error, U, void | Promise<void>>, waitForPrevious: boolean): Promise<void>
{
    const promises: PromiseLike<unknown>[] = [];
    const deferred = new Deferred<void>();
    if (complete)
    {
        const oldComplete = complete;
        complete = (e: Error, ...args) =>
        {
            try
            {
                oldComplete(e, ...args);
                if (e)
                    deferred.reject(e);
                else
                    deferred.resolve();
            }
            catch (e)
            {
                deferred.reject(e);
            }
        };
    }
    else
        //eslint-disable-next-line @typescript-eslint/no-unused-vars
        complete = (e: Error, ..._args: unknown[]) =>
        {
            if (e)
                deferred.reject(e);
            else
                deferred.resolve();
        }

    const errors: Error[] = [];

    function loop(i)
    {
        if (i == array.length)
        {
            Promise.all(promises).then(async (res) =>
            {
                try
                {
                    if (errors.length > 0)
                        throw new AggregateErrors(errors);

                    await (complete as unknown as SimpleNextFunction<Error>)()
                    return res;
                }
                catch (e)
                {
                    (complete as unknown as SimpleNextFunction<Error>)(e);
                }
            }, err => (complete as unknown as SimpleNextFunction<Error>)(err));
            return;
        }
        else
            try
            {
                const promise = body(array[i], i, function (error?: Error, ...args: U)
                {
                    if (error)
                        if (waitForPrevious)
                            complete(error, ...args);
                        else
                            errors[i] = error;
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
                        promise.then(() => setImmediate(loop, i + 1), complete as unknown as SimpleNextFunction<unknown>);
                }
            }
            catch (e)
            {
                if (waitForPrevious)
                    promises.push(Promise.reject(e));
                else
                    (complete as unknown as SimpleNextFunction<unknown>)(e);
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
export function each<TError, U extends unknown[], T = Record<string, unknown>>(o: T, body: (element: T[typeof i], i: keyof T, next: NextFunction<TError, U>) => void, waitForPrevious?: boolean): PromiseLike<void>
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


    if (typeof complete !== 'boolean' && typeof complete !== 'undefined')
    {
        if (isArrayLike(it))
            return array(it, body, complete, waitForPrevious);
        return object(it, body, complete, waitForPrevious);

    }
    else
    {
        if (Array.isArray(it) || isArrayLike(it))
            return array<unknown, []>(it, body, null, waitForPrevious);
        return object<Record<string, unknown>, []>(it, body, null, waitForPrevious);
    }
}


export async function mapArray<T, U>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<U>, waitForPrevious: boolean): Promise<U[]>
{
    const result = [];
    await array(it, async function (el, i)
    {
        result.push(await body(el, i));
    }, null, waitForPrevious);
    return result;
}

export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray: true, waitForPrevious: boolean): Promise<TResultValue[]>
export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray: false, waitForPrevious: boolean): Promise<{ [P in keyof TIn]?: TResultValue }>
export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray: boolean, waitForPrevious: boolean)
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray: boolean, waitForPrevious: boolean)
{
    const result: Partial<Proxy<TIn, TResultValue>> = {};
    const resultArray: TResultValue[] = [];
    await object(o, async function (el, i)
    {
        if (asArray)
            resultArray.push(await body(el, i));
        else
            result[i] = await body(el, i);
    }, null, waitForPrevious);
    if (asArray)
        return resultArray;
    return result;
}

export function map<T, U>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<U>, asArray: true, waitForPrevious?: boolean): Promise<U[]>
export function map<T, U>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<U>, asArray: boolean, waitForPrevious?: boolean): Promise<U[]>
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i: TKey) => Promise<TResultValue>, asArray?: false, waitForPrevious?: boolean): Promise<Proxy<TIn, TResultValue>>
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i: TKey) => Promise<TResultValue>, asArray: true, waitForPrevious?: boolean): Promise<TResultValue[]>
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function map(it: any, body: (element: any, i: any) => any, asArray?: boolean, waitForPrevious?: boolean)
{
    if (isArrayLike(it))
        return mapArray(it, body, waitForPrevious);
    return mapObject(it, body, asArray, waitForPrevious);
}




export async function grepArray<T>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<boolean>, complete: NextFunction, waitForPrevious: boolean): Promise<T[]>
{
    const result = [];
    await array(it, async function (el, i)
    {
        if (await body(el, i))
            result.push(el);
    }, complete, waitForPrevious);
    return result;
}

// export type Partial<T> = {[P in keyof T]?: T[P]}
export type Proxy<T, U> = { [P in keyof T]: U }

export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: true, complete: NextFunction, waitForPrevious: boolean): Promise<T[keyof T][]>
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: false, complete: NextFunction, waitForPrevious: boolean): Promise<Partial<T>>
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: boolean, complete: NextFunction, waitForPrevious: boolean): Promise<Partial<T> | T[keyof T][]>
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: boolean, complete: NextFunction, waitForPrevious: boolean)
{
    const result: Partial<T> = {};
    const resultArray: T[keyof T][] = [];
    await object(o, async function (el, i)
    {
        if (await body(el, i))
            if (asArray)
                resultArray.push(el);
            else
                result[i] = el;

    }, complete, waitForPrevious);
    if (asArray)
        return resultArray;
    return result;
}

export function grep<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<boolean>, complete?: NextFunction, waitForPrevious?: boolean): Promise<T[]>
export function grep<T>(o: T, body: <U extends keyof T>(element: T[U], i: U) => Promise<boolean>, complete?: NextFunction, waitForPrevious?: boolean): Promise<Partial<T>>
export function grep<T, U extends keyof T>(o: T, body: (element: T[U], i: U) => Promise<boolean>, asArray: true, complete?: NextFunction, waitForPrevious?: boolean): Promise<T[U][]>
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function grep(it: any, body: (element: any, i: any) => Promise<boolean>, asArray?: boolean | NextFunction, complete?: NextFunction | boolean, waitForPrevious?: boolean)
{
    if (isArrayLike(it))
        return grepArray(it, body, asArray as NextFunction, !!complete);
    return grepObject(it, body, asArray as boolean, complete as NextFunction, !!waitForPrevious);
}
