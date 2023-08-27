import { i32 } from './i32.js';
import { i64 } from './i64.js';
import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { memory as memarg } from '../transpilers/memory.js'
import { Module } from './module.js';
import { u32, u8 } from '../transpilers/wasmtype.js';

export { memarg }

export class memory<TNative extends bigint | u32>
{
    private constructor(public readonly address: usizeType<TNative>/*, private readonly nativeType: (...args: unknown[]) => TNative*/)
    {
    }

    public offset(address: TNative, offset: number): TNative
    {
        if (typeof address == 'bigint')
            return address + BigInt(offset) as TNative;
        return address as number + offset as TNative;
    }

    public module()
    {
        return new Module<TNative>()
    }

    public static readonly wasm32 = new memory<u32>(i32 as usizeType<u32>);

    public static readonly wasm64 = new memory<bigint>(i64 as usizeType<bigint>);

    public memarg(offset: bigint | u32, align?: u8): memarg<TNative>
    {
        if (this.address === i32)
            if (typeof offset == 'bigint')
                return memarg.memarg(Number(offset) as TNative, align);
            else
                return memarg.memarg(offset as TNative, align);
        if (typeof offset == 'bigint')
            return memarg.memarg(offset as TNative, align);
        else
            return memarg.memarg(BigInt(offset) as TNative, align);
    }

    public static readonly transpiler = memarg;

    // public static readonly size = [0x3f, 0x00];
    // public static readonly grow = [0x40, 0x00];
    // public static init(x: indexes.data) { return [0xfc, 8, x, 0x00] }
    // public static data_drop(x: indexes.data) { return [0xfc, 9, x, 0x00] }
    // public static readonly copy = [0xfc, 10, 0x00, 0x00];
    // public static readonly fill = [0xfc, 11, 0x00];
}

export interface usize<TNative extends bigint | number> extends wasmtypeInstance<usize<TNative>>
{
    clz(): i32;
    ctz(): i32;
    sub(v: usize<TNative>): usize<TNative>;
    shl(amount: i32): usize<TNative>;
    shr_u(amount: i32): usize<TNative>;
    and(v: usize<TNative>): usize<TNative>;
    or(v: usize<TNative>): usize<TNative>;
    add(v: usize<TNative>): usize<TNative>;
    mul(v: usize<TNative>): usize<TNative>;
    xor(v: usize<TNative>): usize<TNative>;
    store(memory: memarg<TNative>, offset: usize<TNative>): Uint8Array;
    store8(memory: memarg<TNative>, offset: usize<TNative>): Uint8Array;
    store16(memory: memarg<TNative>, offset: usize<TNative>): Uint8Array;
    eqz(): i32;
    eq(other: usize<TNative>): i32;
    gt_u(other: usize<TNative>): i32;
    lt_u(other: usize<TNative>): i32;
    popcnt(): i32;

    type: usizeType<TNative>;
}
export interface usizeType<TNative extends bigint | u32> extends wasmtype<usize<TNative>>
{
    size: number;
    const(v: TNative | u32): usize<TNative>;
    load(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>
    load16_u(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>
    load8_u(memory: memarg<TNative>, offset: usize<TNative>): usize<TNative>
    new(args: Uint8Array): usize<TNative>

    max_u: usize<TNative>;
    max_s: usize<TNative>;
    min_u: usize<TNative>;
    min_s: usize<TNative>;

    Max_u: number | bigint;
    Max_s: number | bigint;
    Min_u: number | bigint;
    Min_s: number | bigint;
}