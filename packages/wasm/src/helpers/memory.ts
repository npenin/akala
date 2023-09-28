import { i32 } from './i32.js';
import { i64 } from './i64.js';
import { memory as transpiler } from '../transpilers/memory.js';
import { wasmtype, wasmtypeInstance } from './wasmtype.js'
import { Module } from './module.js';
import { u32, u8 } from '../transpilers/wasmtype.js';
import { mergeUInt8Arrays } from './types.js';

export class memarg<TNative extends bigint | u32>
{
    constructor(public readonly offset: usize<TNative>, private readonly align?: u8)
    {

    }

    toOpCodes(defaultAlign: u8): Uint8Array
    {
        if (typeof this.offset == 'undefined')
            return new Uint8Array([this.align || defaultAlign, 0])
        else
            return mergeUInt8Arrays([this.align || defaultAlign], this.offset.toOpCodes().slice(1))
    }
}

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

    public static readonly wasm64 = new memory<bigint>(i64);

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

    public size() { return new this.address(transpiler.size); }
    public grow(delta: i32) { return new this.address(mergeUInt8Arrays(transpiler.grow, delta.toOpCodes())); }
    public copy(dest: usize<TNative>, source: usize<TNative>, length: usize<TNative>) { return new this.address(mergeUInt8Arrays(dest.toOpCodes(), source.toOpCodes(), length.toOpCodes(), transpiler.grow)); }
    public fill(dest: usize<TNative>, value: usize<TNative>, length: usize<TNative>) { return new this.address(mergeUInt8Arrays(dest.toOpCodes(), value.toOpCodes(), length.toOpCodes(), transpiler.fill)); }

    // public static init(x: indexes.data) { return [0xfc, 8, x, 0x00] }
    // public static data_drop(x: indexes.data) { return [0xfc, 9, x, 0x00] }
}

export interface usize<TNative extends bigint | number> extends wasmtypeInstance<usize<TNative>>
{
    asconst(): TNative extends bigint ? bigint : u32;
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