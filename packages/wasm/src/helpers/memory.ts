import { i32 } from './i32.js';
import { i64 } from './i64.js';
import { memory as transpiler } from '../transpilers/memory.js';
import { wasmtype, wasmtypeInstance } from './wasmtype.js'
import { Module } from './module.js';
import { u32, u8 } from '../transpilers/wasmtype.js';
import { mergeUInt8Arrays } from './types.js';
import { IsomorphicBuffer } from '@akala/core'

/**
 * Represents memory arguments for WebAssembly memory operations
 * @template TNative - The native type (bigint or u32) for memory addresses
 */
export class memarg<TNative extends bigint | u32>
{
    /**
     * Creates new memory arguments
     * @param offset - Memory offset
     * @param align - Optional alignment value
     */
    constructor(public readonly offset: usize<TNative>, private readonly align?: u8)
    {
    }

    /**
     * Converts memory arguments to WebAssembly opcodes
     * @param defaultAlign - Default alignment to use if none specified
     * @returns Buffer containing the memory arguments
     */
    toOpCodes(defaultAlign: u8): IsomorphicBuffer
    {
        if (typeof this.offset == 'undefined')
            return new IsomorphicBuffer([this.align || defaultAlign, 0])
        else
            return mergeUInt8Arrays([this.align || defaultAlign], this.offset.toOpCodes().subarray(1))
    }
}

/**
 * Manages WebAssembly memory operations
 * @template TNative - The native type (bigint or u32) for memory addresses
 */
export class memory<TNative extends bigint | u32>
{
    private constructor(public readonly address: usizeType<TNative>)
    {
    }

    /**
     * Calculates a memory offset
     * @param address - Base address
     * @param offset - Offset to add
     * @returns The calculated address
     */
    public offset(address: TNative, offset: number): TNative
    {
        if (typeof address == 'bigint')
            return address + BigInt(offset) as TNative;
        return address as number + offset as TNative;
    }

    /**
     * Creates a new module instance
     * @returns A new Module instance
     */
    public module()
    {
        return new Module<TNative>()
    }

    /** 32-bit WebAssembly memory instance */
    public static readonly wasm32 = new memory<u32>(i32 as usizeType<u32>);

    /** 64-bit WebAssembly memory instance */
    public static readonly wasm64 = new memory<bigint>(i64);

    /**
     * Creates memory arguments
     * @param offset - Memory offset
     * @param align - Optional alignment value
     * @returns New memory arguments instance
     */
    public memarg(offset: usize<TNative> | TNative | u32, align?: u8): memarg<TNative>
    {
        switch (typeof offset)
        {
            case 'bigint':
                if (this.address.type === i32.type)
                    return new memarg(this.address.const(Number(BigInt.asUintN(32, offset))) as usize<TNative>, align);
                else
                    return new memarg(this.address.const(offset) as usize<TNative>, align);
            case 'number':
                return new memarg(this.address.const(offset), align);
            default:
                return new memarg(offset, align);
        }
    }

    public static readonly transpiler = transpiler;

    /**
     * Gets the current memory size in pages
     * @returns Size in pages
     */
    public size() { return new this.address(transpiler.size); }

    /**
     * Grows memory by specified number of pages
     * @param delta - Number of pages to grow
     * @returns Previous memory size in pages
     */
    public grow(delta: i32) { return new this.address(mergeUInt8Arrays(transpiler.grow, delta.toOpCodes())); }

    /**
     * Copies data in memory
     * @param dest - Destination address
     * @param source - Source address
     * @param length - Number of bytes to copy
     * @returns Memory instance
     */
    public copy(dest: usize<TNative>, source: usize<TNative>, length: usize<TNative>) { return new this.address(mergeUInt8Arrays(dest.toOpCodes(), source.toOpCodes(), length.toOpCodes(), transpiler.grow)); }

    /**
     * Fills memory region with a value
     * @param dest - Destination address
     * @param value - Value to fill with
     * @param length - Number of bytes to fill
     * @returns Memory instance
     */
    public fill(dest: usize<TNative>, value: usize<TNative>, length: usize<TNative>) { return new this.address(mergeUInt8Arrays(dest.toOpCodes(), value.toOpCodes(), length.toOpCodes(), transpiler.fill)); }
}

/**
 * Interface for unsigned size operations in WebAssembly
 * @template TNative - The native type (bigint or number) for size values
 */
export interface usize<TNative extends bigint | number> extends wasmtypeInstance<usize<TNative>>
{
    /** Converts to constant value */
    asconst(): TNative extends bigint ? bigint : u32;
    /** Counts leading zeros */
    clz(): i32;
    /** Counts trailing zeros */
    ctz(): i32;
    /** Subtracts two values */
    sub(v: usize<TNative>): usize<TNative>;
    /** Left shift */
    shl(amount: i32): usize<TNative>;
    /** Unsigned right shift */
    shr_u(amount: i32): usize<TNative>;
    /** Bitwise AND */
    and(v: usize<TNative>): usize<TNative>;
    /** Bitwise OR */
    or(v: usize<TNative>): usize<TNative>;
    /** Addition */
    add(v: usize<TNative>): usize<TNative>;
    /** Multiplication */
    mul(v: usize<TNative>): usize<TNative>;
    /** Bitwise XOR */
    xor(v: usize<TNative>): usize<TNative>;
    /** Stores value to memory */
    store(memory: memarg<TNative>, offset: usize<TNative>): IsomorphicBuffer;
    /** Stores least significant byte */
    store8(memory: memarg<TNative>, offset: usize<TNative>): IsomorphicBuffer;
    /** Stores least significant 16 bits */
    store16(memory: memarg<TNative>, offset: usize<TNative>): IsomorphicBuffer;
    /** Tests if zero */
    eqz(): i32;
    /** Tests equality */
    eq(other: usize<TNative>): i32;
    /** Unsigned greater than */
    gt_u(other: usize<TNative>): i32;
    /** Unsigned less than */
    lt_u(other: usize<TNative>): i32;
    /** Counts one bits */
    popcnt(): i32;

    type: usizeType<TNative>;
}

/**
 * Interface for unsigned size type operations in WebAssembly
 * @template TNative - The native type (bigint or u32) for size values
 */
export interface usizeType<TNative extends bigint | u32> extends wasmtype<usize<TNative>>
{
    /** Size in bits */
    size: number;
    /** Creates constant value */
    const(v: TNative | u32): usize<TNative>;
    /** Loads value from memory */
    load(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>;
    /** Loads unsigned 16-bit value */
    load16_u(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>;
    /** Loads unsigned 8-bit value */
    load8_u(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>;
    /** Creates new instance */
    new(args: IsomorphicBuffer): usize<TNative>;

    /** Maximum unsigned value */
    max_u: usize<TNative>;
    /** Maximum signed value */
    max_s: usize<TNative>;
    /** Minimum unsigned value */
    min_u: usize<TNative>;
    /** Minimum signed value */
    min_s: usize<TNative>;

    /** Maximum unsigned value constant */
    Max_u: number | bigint;
    /** Maximum signed value constant */
    Max_s: number | bigint;
    /** Minimum unsigned value constant */
    Min_u: number | bigint;
    /** Minimum signed value constant */
    Min_s: number | bigint;
}
