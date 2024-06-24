export function array<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => void): void
{
    Array.prototype.forEach.call(array, body);
}

export function object<TIn>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => void): void
{
    array(Object.keys(o) as (keyof TIn)[], function (key)
    {
        body(o[key], key);
    });
}

export function each<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => void): void
export function each<T>(o: T, body: <U extends keyof T>(element: T[U], i: U) => void): void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function each<T>(it: T | T[], body: (element: any, i: any) => void): void
{
    if (isArrayLike(it))
        return array(it, body);
    return object(it, body);
}

export function grepArray<T>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => boolean): T[]
{
    const result = [];
    array(it, function (el, i)
    {
        if (body(el, i))
            result.push(el);
    });
    return result;
}

// export type Partial<T> = {[P in keyof T]?: T[P]}
export type Proxy<T, U> = { [P in keyof T]: U }

export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => boolean, asArray?: true): T[keyof T][]
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => boolean, asArray: false): Partial<T>
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => boolean, asArray: boolean): Partial<T> | T[keyof T][]
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function grepObject<T>(o: T, body: (element: T[keyof T], i: keyof T) => boolean, asArray: boolean)
{
    const result: Partial<T> = {};
    const resultArray: T[keyof T][] = [];
    object(o, function (el, i)
    {
        if (body(el, i))
            if (asArray)
                resultArray.push(el);
            else
                result[i] = el;

    });
    if (asArray)
        return resultArray;
    return result;
}

export function isArrayLike<T>(t: T[]): true
export function isArrayLike<T>(t: ArrayLike<T>): true
export function isArrayLike<T>(t: unknown): t is ArrayLike<T>
export function isArrayLike<T>(it: unknown): it is ArrayLike<T>
{
    return Array.isArray(it) || typeof (it) != 'undefined' && typeof (it['length']) == 'number'
}

export function grep<T>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => boolean): T[]
export function grep<T>(o: T, body: <U extends keyof T>(element: T[U], i: U) => boolean): Partial<T>
export function grep<T, U extends keyof T>(o: T, body: (element: T[U], i: U) => boolean, asArray: true): T[U][]
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function grep(it: any, body: (element: any, i: any) => boolean, asArray?: boolean)
{
    if (isArrayLike(it))
        return grepArray(it, body);
    return grepObject(it, body, asArray);
}

export function mapArray<T, U>(it: T[] | ArrayLike<T>, body: (element: T, i: number) => U): U[]
{
    const result = [];
    array(it, function (el, i)
    {
        result.push(body(el, i));
    });
    return result;
}

export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray: true): TResultValue[]
export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray?: false): { [P in keyof TIn]?: TResultValue }
export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray?: boolean)
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function mapObject<TIn, TResultValue>(o: TIn, body: (element: TIn[keyof TIn], i: keyof TIn) => TResultValue, asArray?: boolean)
{
    const result: Partial<Proxy<TIn, TResultValue>> = {};
    const resultArray: TResultValue[] = [];
    object(o, function (el, i)
    {
        if (asArray)
            resultArray.push(body(el, i));
        else
            result[i] = body(el, i);
    });
    if (asArray)
        return resultArray;
    return result;
}

export function map<T, U>(array: T[] | ArrayLike<T>, body: (element: T, i: number) => U): U[]
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i: TKey) => TResultValue): Proxy<TIn, TResultValue>
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i: TKey) => TResultValue, asArray: true): TResultValue[]
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function map(it: any, body: (element: any, i: any) => any, asArray?: boolean)
{
    if (isArrayLike(it))
        return mapArray(it, body);
    return mapObject(it, body, asArray);
}


