const backConversion = new WeakMap<object, number>()
const references: Record<number, number[]> = {}

const freeObjectIndices: number[] = [];

const heap = new WebAssembly.Table({ initial: 8, element: 'externref' });
let lastOffset: number = -1;
addObject(undefined);
addObject(true);
addObject(globalThis);
addObject([]);

export enum Types
{
    bigint,
    boolean,
    function,
    number,
    object,
    string,
    symbol,
    undefined,
}

export type Pointer<T extends Types = Types> = [number | bigint, T];

export type PropertyKeys = Types.string | Types.number | Types.symbol;
export type PropertyPointer = Pointer<PropertyKeys>

export function type(obj: any)
{
    return Types[typeof obj];
}

export function toPointer(obj: any, parent?: number): Pointer
{
    switch (typeof obj)
    {
        case 'boolean':
            return [obj ? 1 : 0, Types.boolean];
        case 'number':
        case 'bigint':
            return [obj, Types[typeof obj]];
        case 'undefined':
            return [0, Types.undefined];
        default:
            if (obj === null)
                return [0, Types.object];
            const idx = backConversion.get(obj)
            if (idx)
                return [idx, Types[typeof obj]]
            return [addObject(obj, parent), Types[typeof obj]];

    }
}

export function fromPointer<T = any>(ptr: Pointer): T
{
    switch (ptr[1])
    {
        case Types.bigint:
        case Types.boolean:
        case Types.function:
        case Types.number:
        case Types.object:
        case Types.symbol:
        case Types.string:
            if (typeof ptr[0] === 'bigint' || typeof ptr[0] === 'number')
                return ptr[0] as T;
            return heap.get(ptr[0]);
        case Types.undefined:
            return heap.get(0);
    }
}

function addObject(obj: any, parent?: number): number
{
    const idx = freeObjectIndices.pop() || lastOffset + 1;
    if (idx == heap.length)
        heap.grow(heap.length * 2);
    heap.set(idx, obj);
    backConversion.set(obj, idx);
    if (parent)
    {
        if (!references[parent])
            references[parent] = [];
        references[parent].push(idx);
    }
    return idx;

}

export function getGlobal(): number
{
    return 1; // globalThis is at index 2
}

function getPropertyKey(ptr: PropertyPointer): PropertyKey
{
    if (ptr[1] === Types.string || ptr[1] === Types.number || ptr[1] === Types.symbol)
        return fromPointer(ptr);
    throw new Error('Unknown property key type');
}

export function getProperty(objIdx: Pointer, propPtr: PropertyPointer): Pointer
{
    const obj = fromPointer(objIdx);
    const prop = getPropertyKey(propPtr);
    return toPointer(obj[prop], objIdx[0] as number)
}

export function callMethod(objIdx: Pointer, methodPtr: PropertyPointer, argPtrs: Pointer): Pointer
{
    const obj = fromPointer(objIdx);
    const method = getPropertyKey(methodPtr);
    const args = fromPointer(argPtrs);
    if (!Array.isArray(args))
        return toPointer(obj[method].call(this, args), 0);
    else
        return toPointer(obj[method].apply(this, args), 0);
}

export function unmarshall(type: Types, idx: number): number
{
    const obj = fromPointer([idx, type]);

    switch (typeof obj)
    {
        case "string":
        case "number":
        case "bigint":
        case "boolean":
        case "undefined":
            return Number(obj);
        case "function":
        case "object":
        case "symbol":
            return 0;
    }

}

export function unmarshall64(fPtr: Pointer): bigint
{
    const obj = fromPointer(fPtr);
    switch (typeof obj)
    {
        case "string":
        case "number":
        case "bigint":
        case "boolean":
        case "undefined":
            return BigInt(obj);
        case "function":
        case "object":
        case "symbol":
            return 0n;
    }

}

export function callFunction(fPtr: Pointer<Types.function>, argPtrs: Pointer): Pointer
{
    const f = fromPointer(fPtr) as Function;
    const args = fromPointer(argPtrs);
    if (!Array.isArray(args))
        return toPointer(f.call(this, args), 0);
    else
        return toPointer(f.apply(this, args), 0);
}

export function setProperty(objPtr: Pointer, propPtr: PropertyPointer, valuePtr: Pointer): void
{
    const obj = fromPointer(objPtr);
    const prop = getPropertyKey(propPtr);
    obj[prop] = fromPointer(valuePtr)
}

export function newObject(fPtr?: Pointer, argPtrs?: Pointer): Pointer
{
    if (fPtr)
    {
        const args = fromPointer(argPtrs);
        if (!Array.isArray(args))
            return toPointer(new (fromPointer(fPtr))(args), 0);
        else
            return toPointer(new (fromPointer(fPtr)).apply(this, args), 0);
    }
    else
        return [addObject({}, 0), Types.object];
}

export function addString(s: string): Pointer
{
    return toPointer(s);
}

export function dropObject(idx: number, depth?: number, visited = new Set<number>()): void
{
    if (visited.has(idx))
        return;
    visited.add(idx);

    backConversion.delete(heap.get(idx));
    heap.set(idx, undefined);
    if (idx === lastOffset)
        lastOffset--;
    freeObjectIndices.push(idx);

    if (depth === undefined)
        depth = Number.MAX_SAFE_INTEGER;
    if (depth && references[idx])
    {
        for (let i = 0; i < references[idx].length; i++)
            dropObject(references[idx][i], depth - 1, visited);
        delete references[idx];
    }
}
