import { i32, i32 as i32Type } from './i32.js'
import { i64, i64 as i64Type } from './i64.js'
import { f32, f32 as f32Type } from './f32.js'
import { f64, f64 as f64Type } from './f64.js'
import { v128, v128 as v128Type } from './v128.js'
import { externref, externref as externrefType } from './ref-extern.js'
import { func, func as funcType } from './func.js'
import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'

export
{
    i32Type as i32,
    i64Type as i64,
    f32Type as f32,
    f64Type as f64,
    v128Type as v128,
    externrefType as externref,
    funcType as func,
}

export enum valtype
{
    i32 = i32Type.type,
    i64 = i64Type.type,
    f32 = f32Type.type,
    f64 = f64Type.type,
    v128 = v128Type.type,
    externref = externrefType.type,
    func = funcType.type,
}
// export type valtype = typeof i32.type | typeof i64.type | typeof f32.type | typeof f64.type | typeof v128.type | typeof func.type | typeof externref.type;

export function getValType(type: valtype): wasmtype<unknown>
{
    switch (type)
    {
        case valtype.i32: return i32;
        case valtype.i64: return i64;
        case valtype.f32: return f32;
        case valtype.f64: return f64;
        case valtype.v128: return v128;
        case valtype.externref: return externref;
        case valtype.func: return func;
    }
}

export class blocktype
{
    public static readonly empty = 0x40;
    public static value(type: valtype) { return type; }
    public static type(type: indexes.type) { return type; }
}

export function mergeUInt8Arrays(...arrays: (Uint8Array | ArrayLike<number>)[])
{
    const result = new Uint8Array(arrays.reduce((previous, current) => previous + current.length, 0));

    let offset = 0;
    for (let i = 0; i < arrays.length; i++)
    {
        result.set(arrays[i], offset)
        offset += arrays[i].length;
    }
    return result;
}