/** 
 * Async iteration over array-like and object structures
 * @module eachAsync
 */
import { isArrayLike } from './each.js';

/** 
 * Type representing an async iteration callback function.
 * @template TError - Error type
 * @template T - Argument array type
 * @template TReturn - Return type
 */
export type NextFunction<TError = unknown, T extends unknown[] = [], TReturn = void> = (error?: TError, ...args: T) => TReturn;
/** 
 * Simplified version of NextFunction for cases without arguments.
 * @template T - Error type
 */
export type SimpleNextFunction<T> = NextFunction<T, [], void | Promise<void>>;

/** 
 * Represents an error that aggregates multiple errors from asynchronous iterations.
 * @class
 * @extends {Error}
 * @property {Error[]} errors - The array of errors that occurred during iteration.
 */
export class AggregateErrors extends Error
{
    constructor(public readonly errors: Error[])
    {
        super('One or more errors occurred. Please see errors field for more details');
    }
}

/** 
 * Asynchronously iterates over elements of an array-like structure.
 * @param {T[] | ArrayLike<T>} array - Array-like structure to iterate over
 * @param {(element: T, i: number) => Promise<void>} body - Async callback executed for each element
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration to complete before next
 * @returns {Promise<void>} Resolves when all iterations complete
 */
export async function array<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<void>, waitForPrevious: boolean): Promise<void>
{
    if (typeof waitForPrevious == 'undefined')
        waitForPrevious = true;

    if (waitForPrevious)
        for (let index = 0; index < array.length; index++)
        {
            const element = array[index];
            await body(element, index);
        }
    else
        if (Array.isArray(array))
            return Promise.all(array.map(body)).then(() => { });
        else
            return Promise.all(Array.prototype.map.call(array, body)).then(() => { });
}

/** 
 * Asynchronously iterates over key-value pairs of an object.
 * @param {T} o - Object to iterate over
 * @param {(element: T[keyof T], i: keyof T) => Promise<void>} body - Async callback for each key-value pair
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration to complete
 * @returns {Promise<void>} Resolves when all iterations complete
 */
export function object<T, U extends unknown[] = []>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<void>, waitForPrevious: boolean): Promise<void>
{
    if (typeof waitForPrevious == 'undefined')
        waitForPrevious = true;
    return array<keyof T>(Object.keys(o) as (keyof T)[], (key, i) => body(o[key], key), waitForPrevious);
}

/** 
 * Unified async iteration entry point for arrays/objects.
 * @function
 * @param {T[] | ArrayLike<T> | Record<string, unknown>} it - Iterable structure to process
 * @param {(element: unknown, i: any) => Promise<void>} body - Async iteration callback
 * @param {boolean} [waitForPrevious=true] - Whether to wait for previous iteration to complete
 * @returns {Promise<void>} Resolves when all iterations complete
 */
export function each<T, TError, U extends unknown[]>(array: T[] | ArrayLike<T>, body: (element: T, i?: number) => Promise<void>, waitForPrevious?: boolean): Promise<void>
export function each<TError, U extends unknown[], T = Record<string, unknown>>(o: T, body: (element: T[typeof i], i: keyof T,) => Promise<void>, waitForPrevious?: boolean): Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function each(it: unknown[] | ArrayLike<unknown> | Record<string, unknown>, body: <TError, U extends unknown[]>(element: unknown, i: any) => Promise<void>, waitForPrevious?: boolean): Promise<void>
{
    if (typeof waitForPrevious === 'undefined')
        waitForPrevious = true;


    if (Array.isArray(it) || isArrayLike(it))
        return array<unknown>(it, body, waitForPrevious);
    return object<Record<string, unknown>, []>(it, body, waitForPrevious);
}


/** 
 * Asynchronously maps elements of an array-like structure to new values.
 * @param {T[] | ArrayLike<T>} it - Array-like structure to process
 * @param {(element: T, i: number) => Promise<U>} body - Async transformation function
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration
 * @returns {Promise<U[]>} Promise resolving to transformed elements
 */
export async function mapArray<T, U>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<U>, waitForPrevious: boolean): Promise<U[]>
{
    const result = [];
    await array(it, async function (el, i)
    {
        result.push(await body(el, i));
    }, waitForPrevious);
    return result;
}

/** 
 * Asynchronously maps key-value pairs of an object to new values.
 * @param {TIn} o - Source object to process
 * @param {(element: TIn[keyof TIn], i: keyof TIn) => TResultValue} body - Transformation function
 * @param {boolean} asArray - Return results as array instead of object
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration
 * @returns {Promise<TResultValue[] | Partial<Proxy<TIn, TResultValue>>>} Transformed results
 */
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
    }, waitForPrevious);
    if (asArray)
        return resultArray;
    return result;
}

/** 
 * Unified async mapping function for arrays/objects.
 * @function
 * @param {T[] | ArrayLike<T> | Record<string, unknown>} it - Iterable structure to process
 * @param {(element: any, i: any) => any} body - Async mapping function
 * @param {boolean} [asArray=false] - Return results as array
 * @param {boolean} [waitForPrevious=true] - Whether to wait between iterations
 * @returns {Promise<any>} Transformed results based on input type
 */
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




/** 
 * Asynchronously filters elements of an array-like structure.
 * @param {T[] | ArrayLike<T>} it - Array-like structure to filter
 * @param {(element: T, i: number) => Promise<boolean>} body - Async predicate function
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration
 * @returns {Promise<T[]>} Filtered elements
 */
export async function grepArray<T>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<boolean>, waitForPrevious: boolean): Promise<T[]>
{
    const result = [];
    await array(it, async function (el, i)
    {
        if (await body(el, i))
            result.push(el);
    }, waitForPrevious);
    return result;
}

// export type Partial<T> = {[P in keyof T]?: T[P]}
export type Proxy<T, U> = { [P in keyof T]: U }

/** 
 * Asynchronously filters key-value pairs of an object.
 * @param {T} o - Object to filter
 * @param {(element: T[keyof T], i: keyof T) => Promise<boolean>} body - Async predicate function
 * @param {boolean} asArray - Return results as array
 * @param {boolean} waitForPrevious - Whether to wait for previous iteration
 * @returns {Promise<T[keyof T][] | Partial<T>>} Filtered results
 */
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: true, waitForPrevious: boolean): Promise<T[keyof T][]>
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: false, waitForPrevious: boolean): Promise<Partial<T>>
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: boolean, waitForPrevious: boolean): Promise<Partial<T> | T[keyof T][]>
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => Promise<boolean>, asArray: boolean, waitForPrevious: boolean)
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

    }, waitForPrevious);
    if (asArray)
        return resultArray;
    return result;
}

/** 
 * Unified async filter function for arrays/objects.
 * @function
 * @param {T[] | ArrayLike<T> | Record<string, unknown>} it - Iterable structure to process
 * @param {(element: any, i: any) => Promise<boolean>} body - Async predicate function
 * @param {boolean} [asArray=false] - Return results as array
 * @param {boolean} [waitForPrevious=true] - Whether to wait between iterations
 * @returns {Promise<any>} Filtered results based on input type
 */
export function grep<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => Promise<boolean>, waitForPrevious?: boolean): Promise<T[]>
export function grep<T>(o: T, body: <U extends keyof T>(element: T[U], i: U) => Promise<boolean>, waitForPrevious?: boolean): Promise<Partial<T>>
export function grep<T, U extends keyof T>(o: T, body: (element: T[U], i: U) => Promise<boolean>, asArray: true, waitForPrevious?: boolean): Promise<T[U][]>
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function grep(it: any, body: (element: any, i: any) => Promise<boolean>, asArray?: boolean, waitForPrevious?: boolean)
{
    if (isArrayLike(it))
        return grepArray(it, body, asArray);
    return grepObject(it, body, asArray, waitForPrevious);
}
