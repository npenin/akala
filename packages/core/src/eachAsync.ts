import { isPromiseLike } from './helpers'
import { Polymorph, polymorph } from './polymorph';

export type NextFunction = (error?, ...args: any[]) => void;

export function array<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction) => void | PromiseLike<void>, complete: NextFunction, waitForPrevious: boolean)
{
    var promises: PromiseLike<any>[] = [];
    function loop(i)
    {
        if (i == array.length)
            Promise.all(promises).then(() => complete());
        else
            try
            {
                var promise = body(array[i], i, function (error?)
                {
                    if (error)
                        complete(error);
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
                        promise.then(() => setImmediate(loop, i + 1), complete);
                }
            }
            catch (e)
            {
                complete(e);
            }
    }
    loop(0);
}

export function object<T>(o: T, body: (element: T[keyof T], i: keyof T, next?: NextFunction) => void, complete: NextFunction, waitForPrevious: boolean)
{
    if (typeof waitForPrevious == 'undefined')
        waitForPrevious = true;
    array(Object.keys(o) as (keyof T)[], (key, i, next) => body(o[key], key, next), complete, waitForPrevious);
}

export function each<T>(array: T[] | ArrayLike<T>, body: (element: T, i?: number, next?: NextFunction) => PromiseLike<void>, complete: NextFunction, waitForPrevious?: boolean): void
export function each<T>(array: T[] | ArrayLike<T>, body: (element: T, i?: number, next?: NextFunction) => PromiseLike<void>, waitForPrevious?: boolean): PromiseLike<void>
export function each<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction) => void, complete: NextFunction, waitForPrevious?: boolean): void
export function each(o: any, body: (element: any, i: string, next: NextFunction) => void, complete: NextFunction, waitForPrevious?: boolean): void
export function each<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number, next: NextFunction) => void, waitForPrevious?: boolean): PromiseLike<void>
export function each(o: any, body: (element: any, i: string, next: NextFunction) => void, waitForPrevious?: boolean): PromiseLike<void>
export function each(it: any, body: (element: any, i: any, next: NextFunction) => void, complete?: NextFunction | boolean, waitForPrevious?: boolean): void | PromiseLike<void>
{
    if (typeof complete === 'boolean')
    {
        waitForPrevious = complete;
        complete = undefined;
    }

    if (typeof waitForPrevious === 'undefined')
        waitForPrevious = true;


    if (complete)
    {
        if (Array.isArray(it) || typeof (it['length']) != 'undefined')
            return array(it, body, complete as NextFunction, waitForPrevious);
        return object(it, body, complete as NextFunction, waitForPrevious);

    }
    else
    {
        return new Promise((resolve, reject) =>
        {
            if (Array.isArray(it) || typeof (it['length']) != 'undefined')
                return array(it, body, function (err)
                {
                    if (err)
                        reject(err);
                    else
                        resolve();
                }, waitForPrevious);
            return object(it, body, function (err)
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
export async function map<T, U>(o: T, body: (element: any, i: string) => PromiseLike<U>, waitForPrevious?: boolean): Promise<U[]>
export async function map<U>(it: any, body: (element: any, i: any) => PromiseLike<U>, waitForPrevious?: boolean): Promise<U[]>
{
    var promises: PromiseLike<U>[] = [];
    return each(it, async (el, i) =>
    {
        promises.push(body(el, i));
    }, waitForPrevious).then(() => Promise.all(promises))
}