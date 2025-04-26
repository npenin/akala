import { indexes, wasmtypeInstance } from './wasmtype.js'
import { memarg } from '../helpers/memory.js'
import { local } from '../transpilers/local.js';
import { i32 as transpiler } from '../transpilers/i32.js'
import { f32 } from './f32.js';
import { i64 } from './i64.js';
import { f64 } from './f64.js';
import { global } from '../transpilers/global.js'
import { usize } from './memory.js';
import { mergeUInt8Arrays } from './types.js';
import { u32 } from '../transpilers/wasmtype.js';
import { Cursor, parsers } from '@akala/protocol-parser';
import { IsomorphicBuffer } from '@akala/core';

/**
 * Represents a 32-bit integer in WebAssembly
 * Provides methods for arithmetic operations, comparisons, and type conversions
 */
export class i32 implements wasmtypeInstance<i32>, usize<u32>
{
    /**
     * Creates a new i32 instance
     * @param initialOp - The initial operation buffer
     */
    public constructor(private initialOp: IsomorphicBuffer) { }

    /**
     * Converts the i32 operation to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    public toOpCodes()
    {
        return this.initialOp.subarray(0);
    }

    /** Size in bits of the i32 type */
    public static readonly size = 32;

    public static readonly transpiler = transpiler;

    /** Maximum unsigned 32-bit integer value */
    public static Max_u = -1;
    /** Maximum signed 32-bit integer value */
    public static Max_s = 0x7fffffff;
    /** Minimum unsigned 32-bit integer value */
    public static Min_u = 0x0;
    /** Minimum signed 32-bit integer value */
    public static Min_s = 0x80000000;

    /** Constant for maximum unsigned value */
    public static max_u = i32.const(this.Max_u);
    /** Constant for maximum signed value */
    public static max_s = i32.const(this.Max_s);
    /** Constant for minimum unsigned value */
    public static min_u = i32.const(this.Min_u);
    /** Constant for minimum signed value */
    public static min_s = i32.const(this.Min_s);

    /** WebAssembly type code for i32 */
    public static readonly type = 0x7f;
    public readonly type = i32;

    /**
     * Creates an empty i32 instance
     * @returns A new i32 instance with empty operation buffer
     */
    public static pop()
    {
        return new i32(new IsomorphicBuffer(0));
    }

    /**
     * Creates an i32 from a local variable
     * @param index - The index of the local variable
     * @returns A new i32 instance representing the local variable
     */
    public static fromLocal(index: indexes.local) { return new i32(new IsomorphicBuffer([local.get, index])); }

    /**
     * Sets a local variable and returns its value
     * @param index - The index of the local variable
     * @returns A new i32 instance with the tee operation
     */
    public teeLocal(index: indexes.local) { return new i32(mergeUInt8Arrays(this.initialOp, [local.tee, index])); }

    /**
     * Creates an i32 from a global variable
     * @param index - The index of the global variable
     * @returns A new i32 instance representing the global variable
     */
    public static fromGlobal(index: indexes.global) { return new i32(new IsomorphicBuffer([global.get, index])); }

    public static parser = parsers.signedLEB128;

    /**
     * Creates a constant i32 value
     * @param value - The number value to create
     * @returns A new i32 instance representing the constant
     */
    public static const(value: number)
    {
        if (!this.parser) this.parser = new parsers.SignedLEB128(8);
        return new i32(mergeUInt8Arrays([transpiler.const], ...this.parser.write(value)));
    }

    /**
     * Converts the current value to a constant
     * @returns A new i32 instance representing the constant value
     */
    public asconst()
    {
        return i32.parser.read(this.initialOp, new Cursor());
    }

    /**
     * Loads an i32 value from memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     * @returns A new i32 instance representing the loaded value
     */
    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(2))); }

    /**
     * Loads a signed 8-bit value and sign-extends to i32
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load8_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_s], m.toOpCodes(0))); }

    /**
     * Loads an unsigned 8-bit value and zero-extends to i32
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load8_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_u], m.toOpCodes(0))); }

    /**
     * Loads a signed 16-bit value and sign-extends to i32
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load16_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_s], m.toOpCodes(1))); }

    /**
     * Loads an unsigned 16-bit value and zero-extends to i32
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public static load16_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_u], m.toOpCodes(1))); }

    /**
     * Stores an i32 value to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(2)); }

    /**
     * Stores the least significant 8 bits of an i32 to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store8<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store8], m.toOpCodes(0)); }

    /**
     * Stores the least significant 16 bits of an i32 to memory
     * @param m - Memory arguments
     * @param offset - Memory offset
     */
    public store16<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store16], m.toOpCodes(1)); }

    // Comparison Operations
    /**
     * Tests if the value is equal to zero
     */
    public eqz() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.eqz])); }

    /**
     * Compares two i32 values for equality
     * @param rhs - Right-hand side operand
     */
    public eq(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.eq])); }

    /**
     * Compares two i32 values for inequality
     * @param rhs - Right-hand side operand
     */
    public ne(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.ne])); }

    /**
     * Signed less than comparison
     * @param rhs - Right-hand side operand
     */
    public lt_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.lt_s])); }

    /**
     * Unsigned less than comparison
     * @param rhs - Right-hand side operand
     */
    public lt_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.lt_u])); }

    /**
     * Signed greater than comparison
     * @param rhs - Right-hand side operand
     */
    public gt_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.gt_s])); }

    /**
     * Unsigned greater than comparison
     * @param rhs - Right-hand side operand
     */
    public gt_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.gt_u])); }

    /**
     * Signed less than or equal to comparison
     * @param rhs - Right-hand side operand
     */
    public le_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.le_s])); }

    /**
     * Unsigned less than or equal to comparison
     * @param rhs - Right-hand side operand
     */
    public le_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.le_u])); }

    /**
     * Signed greater than or equal to comparison
     * @param rhs - Right-hand side operand
     */
    public ge_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.ge_s])); }

    /**
     * Unsigned greater than or equal to comparison
     * @param rhs - Right-hand side operand
     */
    public ge_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.ge_u])); }

    /**
     * Counts the leading zero bits
     */
    public clz() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.clz])); }

    /**
     * Counts the trailing zero bits
     */
    public ctz() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.ctz])); }

    /**
     * Counts the number of one bits
     */
    public popcnt() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.popcnt])); }

    /**
     * Adds two i32 values
     * @param rhs - Right-hand side operand
     */
    public add(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.add])); }

    /**
     * Subtracts two i32 values
     * @param rhs - Right-hand side operand
     */
    public sub(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.sub])); }

    /**
     * Multiplies two i32 values
     * @param rhs - Right-hand side operand
     */
    public mul(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.mul])); }

    /**
     * Divides two i32 values (signed)
     * @param rhs - Right-hand side operand
     */
    public div_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.div_s])); }

    /**
     * Divides two i32 values (unsigned)
     * @param rhs - Right-hand side operand
     */
    public div_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.div_u])); }

    /**
     * Computes the remainder of two i32 values (signed)
     * @param rhs - Right-hand side operand
     */
    public rem_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.rem_s])); }

    /**
     * Computes the remainder of two i32 values (unsigned)
     * @param rhs - Right-hand side operand
     */
    public rem_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.rem_u])); }

    /**
     * Performs a bitwise AND operation
     * @param rhs - Right-hand side operand
     */
    public and(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.and])); }

    /**
     * Performs a bitwise OR operation
     * @param rhs - Right-hand side operand
     */
    public or(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.or])); }

    /**
     * Performs a bitwise XOR operation
     * @param rhs - Right-hand side operand
     */
    public xor(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.xor])); }

    /**
     * Performs a left shift operation
     * @param rhs - Right-hand side operand
     */
    public shl(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.shl])); }

    /**
     * Performs a right shift operation (signed)
     * @param rhs - Right-hand side operand
     */
    public shr_s(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.shr_s])); }

    /**
     * Performs a right shift operation (unsigned)
     * @param rhs - Right-hand side operand
     */
    public shr_u(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.shr_u])); }

    /**
     * Rotates bits to the left
     * @param rhs - Right-hand side operand
     */
    public rotl(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.rotl])); }

    /**
     * Rotates bits to the right
     * @param rhs - Right-hand side operand
     */
    public rotr(rhs: i32) { return new i32(mergeUInt8Arrays(this.initialOp, rhs.initialOp, [transpiler.rotr])); }

    /**
     * Sign-extends the least significant 8 bits
     */
    public extend8_s() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.extend8_s])); }

    /**
     * Sign-extends the least significant 16 bits
     */
    public extend16_s() { return new i32(mergeUInt8Arrays(this.initialOp, [transpiler.extend16_s])); }

    /** f32.reinterpret_i32 */
    public tof32() { return new f32(mergeUInt8Arrays(this.initialOp, [f32.transpiler.reinterpret_i32])); }

    public extend_s() { return new i64(mergeUInt8Arrays(this.initialOp, [i64.transpiler.extend_i32_s])); }

    public extend_u() { return new i64(mergeUInt8Arrays(this.initialOp, [i64.transpiler.extend_i32_u])); }

    public tof64_s() { return new f64(mergeUInt8Arrays(this.initialOp, [f64.transpiler.convert_i32_s])); }

    public tof64_u() { return new f64(mergeUInt8Arrays(this.initialOp, [f64.transpiler.convert_i32_u])); }

    public convert_s() { return new f32(mergeUInt8Arrays(this.initialOp, [f32.transpiler.convert_i32_s])); }

    public convert_u() { return new f32(mergeUInt8Arrays(this.initialOp, [f32.transpiler.convert_i32_u])); }
}
