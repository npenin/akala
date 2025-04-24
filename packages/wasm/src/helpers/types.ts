import { i32, i32 as i32Type } from './i32.js'
import { i64, i64 as i64Type } from './i64.js'
import { f32, f32 as f32Type } from './f32.js'
import { f64, f64 as f64Type } from './f64.js'
import { v128, v128 as v128Type } from './v128.js'
import { externref, externref as externrefType } from './ref-extern.js'
import { func, func as funcType } from './func.js'
import { indexes, wasmtype } from './wasmtype.js'
import { IsomorphicBuffer } from '@akala/core'

// Type re-exports for convenience
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

/**
 * WebAssembly value types
 * Represents the basic value types available in WebAssembly
 */
export enum valtype
{
    /** 32-bit integer */
    i32 = i32Type.type,
    /** 64-bit integer */
    i64 = i64Type.type,
    /** 32-bit floating point */
    f32 = f32Type.type,
    /** 64-bit floating point */
    f64 = f64Type.type,
    /** 128-bit vector */
    v128 = v128Type.type,
    /** External reference */
    externref = externrefType.type,
    /** Function reference */
    func = funcType.type,
}

/**
 * Gets the WebAssembly type instance for a given value type
 * @param type - The value type to convert
 * @returns The corresponding WebAssembly type instance
 */
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

/**
 * Block type utilities for WebAssembly
 * Used for defining types in control flow structures
 */
export class blocktype
{
    /** Empty block type */
    public static readonly empty = 0x40;

    /**
     * Creates a block type from a value type
     * @param type - The value type for the block
     * @returns The block type encoding
     */
    public static value(type: valtype) { return type; }

    /**
     * Creates a block type from a type index
     * @param type - The type index for the block
     * @returns The block type encoding
     */
    public static type(type: indexes.type) { return type; }
}

/**
 * Merges multiple Uint8Arrays or IsomorphicBuffers into a single buffer
 * @param arrays - Arrays to merge
 * @returns A new IsomorphicBuffer containing all the arrays concatenated
 */
export function mergeUInt8Arrays(...arrays: (IsomorphicBuffer | ArrayLike<number>)[])
{
    return IsomorphicBuffer.concat(arrays.map(a => a instanceof IsomorphicBuffer ? a : new IsomorphicBuffer(new Uint8Array(a))));
}
