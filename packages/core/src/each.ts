export function array<T>(array: T[], body: (element: T, i?: number) => void)
{
    Array.prototype.forEach.call(array, body);
}

export function object<TIn>(o: TIn, body: <TKey extends keyof TIn>(element: TIn[TKey], i?: TKey) => void)
{
    array(Object.keys(o), function <TKey extends keyof TIn>(key: TKey)
    {
        body(o[key], key);
    });
}

export function each<T>(array: T[], body: (element: T, i?: number) => void)
export function each<T>(o: T, body: <U extends keyof T>(element: T[U], i?: U) => void)
export function each(it: any, body: (element: any, i: any) => void)
{
    if (Array.isArray(it))
        return array(it, body);
    return object(it, body);
}

export function grepArray<T>(it: T[], body: (element: T, i?: number) => boolean): T[]
{
    var result = [];
    array(it, function (el, i)
    {
        if (body(el, i))
            result.push(el);
    });
    return result;
}

// export type Partial<T> = {[P in keyof T]?: T[P]}
export type Proxy<T, U> = {[P in keyof T]: U}

export function grepObject<T, U extends keyof T>(o: T, body: (element: T[U], i?: U) => boolean, asArray?: true): T[U][]
export function grepObject<T, U extends keyof T>(o: T, body: (element: T[U], i?: U) => boolean, asArray: false): Partial<T>
export function grepObject<T, U extends keyof T>(o: T, body: (element: T[U], i?: U) => boolean, asArray: boolean)
export function grepObject<T, U extends keyof T>(o: T, body: (element: T[U], i?: U) => boolean, asArray: boolean)
{
    var result: Partial<T> = {};
    var resultArray: T[U][] = [];
    object(o, function (el, i)
    {
        if (body(el, <any>i))
            if (asArray)
                resultArray.push(el);
            else
                result[i] = el;

    });
    return result;
}

export function grep<T>(array: T[], body: (element: T, i?: number) => boolean): T[]
export function grep<T>(o: T, body: <U extends keyof T>(element: T[U], i?: U) => boolean, asArray?: false): Partial<T>
export function grep<T, U extends keyof T>(o: T, body: (element: T[U], i?: U) => boolean, asArray: true): T[U][]
export function grep(it: any, body: (element: any, i?: any) => boolean, asArray?: boolean)
{
    if (Array.isArray(it))
        return grepArray(it, body);
    return grepObject(it, body, asArray);
}

export function mapArray<T, U>(it: T[], body: (element: T, i?: number) => U): U[]
{
    var result = [];
    array(it, function (el, i)
    {
        result.push(body(el, i));
    });
    return result;
}

export function mapObject<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: keyof TIn) => TResultValue, asArray: true): TResultValue[]
export function mapObject<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: keyof TIn) => TResultValue, asArray?: false): {[P in keyof TIn]?: TResultValue }
export function mapObject<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: keyof TIn) => TResultValue, asArray?: boolean)
export function mapObject<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: keyof TIn) => TResultValue, asArray?: boolean)
{
    var result: Partial<Proxy<TIn, TResultValue>> = {};
    var resultArray: TResultValue[] = [];
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

export function map<T, U>(array: T[], body: (element: T, i?: number) => U): U[]
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: TKey) => TResultValue, asArray: false): Proxy<TIn, TResultValue>
export function map<TIn, TKey extends keyof TIn, TResultValue>(o: TIn, body: (element: TIn[TKey], i?: TKey) => TResultValue, asArray: true): TResultValue[]
export function map(it: any, body: (element: any, i?: any) => any, asArray?: boolean)
{
    if (Array.isArray(it))
        return mapArray(it, body);
    return mapObject(it, body, asArray);
}


