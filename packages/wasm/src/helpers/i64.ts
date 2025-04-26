import { local } from '../transpilers/local.js';
import { global } from '../transpilers/global.js';
import { memarg } from '../helpers/memory.js';
import { indexes, wasmtypeInstance } from './wasmtype.js'
import { i64 as transpiler } from '../transpilers/i64.js'
import { f32 } from './f32.js';
import { i32 } from './i32.js';
import { f64, mergeUInt8Arrays } from './types.js';
import { usize } from './memory.js';
import { u32 } from '../transpilers/wasmtype.js';
import { Cursor, parsers } from '@akala/protocol-parser';
import { IsomorphicBuffer } from '@akala/core';


/**
 * Represents a 64-bit integer in WebAssembly
 * Provides methods for arithmetic operations, comparisons, and type conversions
 */
export class i64 implements wasmtypeInstance<i64>, usize<bigint>
{
    /**
     * Creates a new i64 instance
     * @param initialOp - The initial operation buffer
     */
    public constructor(private initialOp: IsomorphicBuffer) { }

    /**
     * Converts the i64 operation to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    public toOpCodes(): IsomorphicBuffer
    {
        return this.initialOp.subarray(0);
    }

    public static readonly transpiler = transpiler;

    /** Maximum signed 64-bit integer value */
    static Max_s = BigInt('0x7fffffffffffffff');
    /** Minimum signed 64-bit integer value */
    static Min_s = BigInt('0x4000000000000000');
    /** Constant for maximum signed value */
    static max_s = i64.const(this.Max_s);
    /** Constant for minimum signed value */
    static min_s = i64.const(this.Min_s);
    /** Maximum unsigned 64-bit integer value */
    static Max_u = BigInt(-1n);
    /** Minimum unsigned 64-bit integer value */
    static Min_u = BigInt(0n);
    /** Constant for maximum unsigned value */
    static max_u = i64.const(this.Max_u);
    /** Constant for minimum unsigned value */
    static min_u = i64.const(this.Min_u);

    /** WebAssembly type code for i64 */
    public static readonly type = transpiler.type;
    public readonly type = i64;
    /** Size in bits of the i64 type */
    public static readonly size = 64;

    /**
     * Creates an empty i64 instance
     * @returns A new i64 instance with empty operation buffer
     */
    public static pop()
    {
        return new i64(new IsomorphicBuffer(0));
    }

    /**
     * Creates an i64 from a local variable
     * @param index - The index of the local variable
     * @returns A new i64 instance representing the local variable
     */
    public static fromLocal(index: indexes.local) { return new i64(new IsomorphicBuffer([local.get, index])); }

    /**
     * Sets a local variable and returns its value
     * @param index - The index of the local variable
     * @returns A new i64 instance with the tee operation
     */
    public teeLocal(index: indexes.local) { return new i64(new IsomorphicBuffer([local.tee, index])); }

    /**
     * Creates an i64 from a global variable
     * @param index - The index of the global variable
     * @returns A new i64 instance representing the global variable
     */
    public static fromGlobal(index: indexes.global) { return new i64(new IsomorphicBuffer([global.get, index])); }

    public static parser = new parsers.SignedLEB128(8);

    /**
     * Creates a constant i64 value
     * @param value - The bigint or u32 value to create
     * @returns A new i64 instance representing the constant
     */
    public static const(value: bigint | u32)
    {
        if (!this.parser) this.parser = new parsers.SignedLEB128(8);
        return new i64(mergeUInt8Arrays([0x42], ...this.parser.write(value)));
    }

    /**
     * Converts the current value to a constant
     * @returns The bigint value of the constant
     */
    public asconst()
    {
        return BigInt(i64.parser.read(this.initialOp, new Cursor()));
    }

    // Memory Operations
    /**
     * Loads an i64 value from memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns A new i64 instance representing the loaded value
     */
    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(3))); }

    /**
     * Loads a signed 8-bit value and sign-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load8_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_s], m.toOpCodes(3))); }

    /**
     * Loads an unsigned 8-bit value and zero-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load8_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_u], m.toOpCodes(3))); }

    /**
     * Loads a signed 16-bit value and sign-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load16_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_s], m.toOpCodes(3))); }

    /**
     * Loads an unsigned 16-bit value and zero-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load16_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_u], m.toOpCodes(3))); }

    /**
     * Loads a signed 32-bit value and sign-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load32_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load32_s], m.toOpCodes(3))); }

    /**
     * Loads an unsigned 32-bit value and zero-extends to i64
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load32_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load32_u], m.toOpCodes(3))); }

    /**
     * Stores an i64 value to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(3)); }

    /**
     * Stores the least significant 8 bits of an i64 to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store8<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store8], m.toOpCodes(3)); }

    /**
     * Stores the least significant 16 bits of an i64 to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store16<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store16], m.toOpCodes(3)); }

    /**
     * Stores the least significant 32 bits of an i64 to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store32<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store32], m.toOpCodes(3)); }

    /**
     * Wraps an i64 to an i32, truncating the upper 32 bits
     * @returns A new i32 instance
     */
    public wrap() { return new i32(mergeUInt8Arrays(this.initialOp, [i32.transpiler.wrap_i64])) }

    // Comparison Operations
    /**
     * Tests if the value is equal to zero
     * @returns A new i32 instance with the comparison result
     */
    public eqz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.eqz]
        ))
    }

    /**
     * Compares two i64 values for equality
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public eq(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }

    /**
     * Compares two i64 values for inequality
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public ne(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }

    /**
     * Compares if the value is less than another (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public lt_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_s]
        ))
    }

    /**
     * Compares if the value is less than another (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public lt_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_u]
        ))
    }

    /**
     * Compares if the value is greater than another (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public gt_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_s]
        ))
    }

    /**
     * Compares if the value is greater than another (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public gt_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_u]
        ))
    }

    /**
     * Compares if the value is less than or equal to another (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public le_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_s]
        ))
    }

    /**
     * Compares if the value is less than or equal to another (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public le_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_u]
        ))
    }

    /**
     * Compares if the value is greater than or equal to another (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public ge_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge_s]
        ))
    }

    /**
     * Compares if the value is greater than or equal to another (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i32 instance with the comparison result
     */
    public ge_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge_u]
        ))
    }

    // Bit Operations
    /**
     * Counts the leading zero bits
     * @returns A new i32 instance with the count
     */
    public clz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.clz]
        ))
    }

    /**
     * Counts the trailing zero bits
     * @returns A new i32 instance with the count
     */
    public ctz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.ctz]
        ))
    }

    /**
     * Counts the number of one bits
     * @returns A new i32 instance with the count
     */
    public popcnt()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.popcnt]
        ))
    }

    // Arithmetic Operations
    /**
     * Adds two i64 values
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the sum
     */
    public add(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }

    /**
     * Subtracts two i64 values
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the difference
     */
    public sub(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }

    /**
     * Multiplies two i64 values
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the product
     */
    public mul(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }

    /**
     * Divides two i64 values (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the quotient
     */
    public div_s(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_s]
        ))
    }

    /**
     * Divides two i64 values (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the quotient
     */
    public div_u(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_u]
        ))
    }

    /**
     * Computes the remainder of two i64 values (signed)
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the remainder
     */
    public rem_s(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_s]
        ))
    }

    /**
     * Computes the remainder of two i64 values (unsigned)
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the remainder
     */
    public rem_u(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_u]
        ))
    }

    /**
     * Performs a bitwise AND operation
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the result
     */
    public and(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.and]
        ))
    }

    /**
     * Performs a bitwise OR operation
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the result
     */
    public or(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.or]
        ))
    }

    /**
     * Performs a bitwise XOR operation
     * @param rhs - Right-hand side operand
     * @returns A new i64 instance with the result
     */
    public xor(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.xor]
        ))
    }

    /**
     * Shifts the value left by a specified number of bits
     * @param rhs - The number of bits to shift
     * @returns A new i64 instance with the shifted value
     */
    public shl(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shl]
        ))
    }

    /**
     * Shifts the value right by a specified number of bits (signed)
     * @param rhs - The number of bits to shift
     * @returns A new i64 instance with the shifted value
     */
    public shr_s(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shr_s]
        ))
    }

    /**
     * Shifts the value right by a specified number of bits (unsigned)
     * @param rhs - The number of bits to shift
     * @returns A new i64 instance with the shifted value
     */
    public shr_u(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shr_u]
        ))
    }

    /**
     * Rotates the bits left by a specified number of bits
     * @param rhs - The number of bits to rotate
     * @returns A new i64 instance with the rotated value
     */
    public rotl(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotl]
        ))
    }

    /**
     * Rotates the bits right by a specified number of bits
     * @param rhs - The number of bits to rotate
     * @returns A new i64 instance with the rotated value
     */
    public rotr(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotr]
        ))
    }

    // Extension Operations
    /**
     * Sign-extends the least significant 8 bits
     * @returns A new i64 instance with the sign-extended value
     */
    public extend8_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend8_s]
        ))
    }

    /**
     * Sign-extends the least significant 16 bits
     * @returns A new i64 instance with the sign-extended value
     */
    public extend16_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend16_s]
        ))
    }

    /**
     * Sign-extends the least significant 32 bits
     * @returns A new i64 instance with the sign-extended value
     */
    public extend32_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend32_s]
        ))
    }

    // Type Conversions
    /**
     * Converts to f32 (signed)
     * @returns A new f32 instance
     */
    public tof32_s()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i64_s]
        ))
    }

    /**
     * Converts to f32 (unsigned)
     * @returns A new f32 instance
     */
    public tof32_u()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i64_u]
        ))
    }

    /**
     * Reinterprets the bits as an f64
     * @returns A new f64 instance
     */
    public reinterpret()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.reinterpret_i64]
        ))
    }
}

export const type = transpiler.type
