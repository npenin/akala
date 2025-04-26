import { memarg } from '../helpers/memory.js';
import { indexes, wasmtypeInstance } from './wasmtype.js'
import { f64 as transpiler } from '../transpilers/f64.js'
import { i32 } from './i32.js';
import { i64 } from './i64.js';
import { f32, mergeUInt8Arrays } from './types.js';
import { local } from '../transpilers/local.js';
import { global } from './global.js';
import { usize } from './memory.js';
import { u32 } from '../transpilers/wasmtype.js';
import { IsomorphicBuffer } from '@akala/core';


/**
 * Represents a 64-bit floating-point number in WebAssembly
 * Provides methods for arithmetic operations, comparisons, and type conversions
 */
export class f64 implements wasmtypeInstance<f64>
{
    /**
     * Creates a new f64 instance
     * @param initialOp - The initial operation buffer
     */
    public constructor(private initialOp: IsomorphicBuffer) { }

    /**
     * Converts the f64 operation to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    toOpCodes(): IsomorphicBuffer
    {
        return this.initialOp.subarray(0)
    }

    public static readonly type = transpiler.type;
    public readonly type = f64;

    /**
     * Creates an empty f64 instance
     * @returns A new f64 instance with empty operation buffer
     */
    public static pop()
    {
        return new f64(new IsomorphicBuffer(0));
    }

    public static readonly transpiler = transpiler;

    /**
     * Creates an f64 from a local variable
     * @param index - The index of the local variable
     * @returns A new f64 instance representing the local variable
     */
    public static fromLocal(index: indexes.local) { return new f32(new IsomorphicBuffer([local.get, index])); }

    /**
     * Sets a local variable and returns its value
     * @param index - The index of the local variable
     * @returns A new f64 instance with the tee operation
     */
    public teeLocal(index: indexes.local) { return new f32(new IsomorphicBuffer([local.tee, index])); }

    /**
     * Creates an f64 from a global variable
     * @param index - The index of the global variable
     * @returns A new f64 instance representing the global variable
     */
    public static fromGlobal(index: indexes.global) { return new f32(global.get(index)); }

    /**
     * Creates a constant f64 value
     * @param value - The number value to create
     * @returns A new f64 instance representing the constant
     */
    public static const(value: number)
    {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeDoubleLE(value, 0);
        return new f64(new IsomorphicBuffer([transpiler.const, buffer.readUint8(0), buffer.readUint8(1), buffer.readUint8(2), buffer.readUint8(3), buffer.readUint8(4), buffer.readUint8(5), buffer.readUint8(6), buffer.readUint8(7)]));
    }

    /**
     * Loads an f64 value from memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns A new f64 instance representing the loaded value
     */
    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new f64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(3))); }

    /**
     * Stores an f64 value to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns Operation buffer for the store instruction
     */
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(3)); }

    // Arithmetic Operations
    /**
     * Adds two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the sum
     */
    public add(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }

    /**
     * Subtracts two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the difference
     */
    public sub(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }

    /**
     * Multiplies two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the product
     */
    public mul(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }

    /**
     * Divides two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the quotient
     */
    public div(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div]
        ))
    }

    /**
     * Returns the minimum of two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the minimum value
     */
    public min(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.min]
        ))
    }

    /**
     * Returns the maximum of two f64 values
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the maximum value
     */
    public max(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.max]
        ))
    }

    /**
     * Copies the sign from one f64 value to another
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the result
     */
    public copysign(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.copysign]
        ))
    }

    // Comparison Operations
    /**
     * Compares two f64 values for equality
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public eq(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }

    /**
     * Compares two f64 values for inequality
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public ne(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }

    /**
     * Compares if one f64 value is less than another
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public lt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt]
        ))
    }

    /**
     * Compares if one f64 value is greater than another
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public gt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt]
        ))
    }

    /**
     * Compares if one f64 value is less than or equal to another
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public le(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le]
        ))
    }

    /**
     * Compares if one f64 value is greater than or equal to another
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the comparison result
     */
    public ge(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge]
        ))
    }

    /**
     * Returns the absolute value of an f64
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the absolute value
     */
    public abs(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.abs]
        ))
    }

    /**
     * Negates an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the negated value
     */
    public neg(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.neg]
        ))
    }

    /**
     * Returns the ceiling of an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the ceiling value
     */
    public ceil(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ceil]
        ))
    }

    /**
     * Returns the floor of an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the floor value
     */
    public floor(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.floor]
        ))
    }

    /**
     * Truncates an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the truncated value
     */
    public trunc(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.trunc]
        ))
    }

    /**
     * Returns the nearest integer to an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the nearest integer
     */
    public nearest(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.nearest]
        ))
    }

    /**
     * Returns the square root of an f64 value
     * @param rhs - Right-hand side operand
     * @returns A new f64 instance representing the square root
     */
    public sqrt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sqrt]
        ))
    }

    /**
     * Reinterprets the bits of an f64 as an i64
     * @returns A new i64 instance
     */
    public reinterpret()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.reinterpret_f64]
        ))
    }

    /**
     * Demotes an f64 to f32
     * @returns A new f32 instance
     */
    public demote()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.demote_f64]
        ))
    }

    /**
     * Truncates an f64 to a signed i32 with saturation
     * @returns A new i32 instance
     */
    public trunc_sat_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f64_s
        ))
    }

    /**
     * Truncates an f64 to an unsigned i32 with saturation
     * @returns A new i32 instance
     */
    public trunc_sat_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f64_u
        ))
    }

    /**
     * Truncates an f64 to a signed i32
     * @returns A new i32 instance
     */
    public trunc32_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f64_s]
        ))
    }

    /**
     * Truncates an f64 to an unsigned i32
     * @returns A new i32 instance
     */
    public trunc32_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f64_u]
        ))
    }

    /**
     * Truncates an f64 to a signed i64
     * @returns A new i64 instance
     */
    public trunc64_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f64_s]
        ))
    }

    /**
     * Truncates an f64 to an unsigned i64
     * @returns A new i64 instance
     */
    public trunc64_u()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f64_u]
        ))
    }

}

export const type = f64.type
