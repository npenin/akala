import { i32 } from './i32.js';
import { memarg } from '../helpers/memory.js';
import { indexes, wasmtypeInstance } from './wasmtype.js'
import { f32 as transpiler } from '../transpilers/f32.js'
import { i64 } from './i64.js';
import { local } from '../transpilers/local.js';
import { global } from './global.js';
import { f64 } from './f64.js';
import { usize } from './memory.js';
import { mergeUInt8Arrays } from './types.js';
import { u32 } from '../transpilers/wasmtype.js';
import { IsomorphicBuffer } from '@akala/core';

/**
 * Represents a 32-bit floating-point number in WebAssembly
 * Provides methods for arithmetic operations, comparisons, and type conversions
 */
export class f32 implements wasmtypeInstance<f32>
{
    /**
     * Creates a new f32 instance
     * @param initialOp - The initial operation buffer
     */
    public constructor(private readonly initialOp: IsomorphicBuffer) { }

    /**
     * Converts the f32 operation to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    toOpCodes(): IsomorphicBuffer
    {
        return this.initialOp;
    }

    public static readonly type = transpiler.type;
    public readonly type = f32;

    /**
     * Creates an empty f32 instance
     * @returns A new f32 instance with empty operation buffer
     */
    public static pop()
    {
        return new f32(new IsomorphicBuffer(0));
    }

    public static readonly transpiler = transpiler;

    /**
     * Creates an f32 from a local variable
     * @param index - The index of the local variable
     * @returns A new f32 instance representing the local variable
     */
    public static fromLocal(index: indexes.local) { return new f32(new IsomorphicBuffer([local.get, index])); }

    /**
     * Sets a local variable and returns its value
     * @param index - The index of the local variable
     * @returns A new f32 instance with the tee operation
     */
    public teeLocal(index: indexes.local) { return new f32(new IsomorphicBuffer([local.tee, index])); }

    /**
     * Creates an f32 from a global variable
     * @param index - The index of the global variable
     * @returns A new f32 instance representing the global variable
     */
    public static fromGlobal(index: indexes.global) { return new f32(global.get(index)); }

    /**
     * Creates a constant f32 value
     * @param value - The number value to create
     * @returns A new f32 instance representing the constant
     */
    public static const(value: number)
    {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeFloatLE(value, 0);
        return new f32(new IsomorphicBuffer([transpiler.const, buffer.readUint8(0), buffer.readUint8(1), buffer.readUint8(2), buffer.readUint8(3)]));
    }

    /**
     * Loads an f32 value from memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns A new f32 instance representing the loaded value
     */
    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new f32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(2))); }

    /**
     * Stores an f32 value to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns Operation buffer for the store instruction
     */
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(2)); }

    // Arithmetic Operations
    /**
     * Adds two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the sum
     */
    public add(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }

    /**
     * Subtracts two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the difference
     */
    public sub(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }

    /**
     * Multiplies two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the product
     */
    public mul(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }

    /**
     * Divides two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the quotient
     */
    public div(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div]
        ))
    }

    /**
     * Returns the minimum of two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the minimum value
     */
    public min(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.min]
        ))
    }

    /**
     * Returns the maximum of two f32 values
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the maximum value
     */
    public max(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.max]
        ))
    }

    /**
     * Copies the sign from one f32 value to another
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the result
     */
    public copysign(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.copysign]
        ))
    }

    // Comparison Operations
    /**
     * Compares two f32 values for equality
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public eq(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }

    /**
     * Compares two f32 values for inequality
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public ne(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }

    /**
     * Checks if one f32 value is less than another
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public lt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt]
        ))
    }

    /**
     * Checks if one f32 value is greater than another
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public gt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt]
        ))
    }

    /**
     * Checks if one f32 value is less than or equal to another
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public le(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le]
        ))
    }

    /**
     * Checks if one f32 value is greater than or equal to another
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the comparison result
     */
    public ge(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge]
        ))
    }

    /**
     * Returns the absolute value of an f32
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the absolute value
     */
    public abs(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.abs]
        ))
    }

    /**
     * Negates an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the negated value
     */
    public neg(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.neg]
        ))
    }

    /**
     * Returns the ceiling of an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the ceiling value
     */
    public ceil(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ceil]
        ))
    }

    /**
     * Returns the floor of an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the floor value
     */
    public floor(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.floor]
        ))
    }

    /**
     * Truncates an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the truncated value
     */
    public trunc(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.trunc]
        ))
    }

    /**
     * Returns the nearest integer to an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the nearest integer
     */
    public nearest(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.nearest]
        ))
    }

    /**
     * Returns the square root of an f32 value
     * @param rhs - Right-hand side operand
     * @returns A new f32 instance representing the square root
     */
    public sqrt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sqrt]
        ))
    }

    // Type Conversions
    /**
     * Converts f32 to i32
     * @returns A new i32 instance
     */
    public toi32()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f32_s]
        ))
    }

    /**
     * Converts f32 to unsigned i32
     * @returns A new i32 instance
     */
    public tou32()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f32_u]
        ))
    }

    /**
     * Converts f32 to i64
     * @returns A new i64 instance
     */
    public toi64()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f32_s]
        ))
    }

    /**
     * Converts f32 to unsigned i64
     * @returns A new i64 instance
     */
    public tou64()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f32_u]
        ))
    }

    /**
     * Promotes f32 to f64
     * @returns A new f64 instance
     */
    public promote()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.promote_f32]
        ))
    }

    /**
     * Reinterprets the bits of an f32 as an i32
     * @returns A new i32 instance
     */
    public reinterpret()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.reinterpret_f32]
        ))
    }

    /**
     * Truncates an f32 to a signed i32 with saturation
     * @returns A new i32 instance
     */
    public trunc_sat_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f32_s
        ))
    }

    /**
     * Truncates an f32 to an unsigned i32 with saturation
     * @returns A new i32 instance
     */
    public trunc_sat_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f32_u
        ))
    }
}
