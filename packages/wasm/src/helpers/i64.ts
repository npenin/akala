import { local } from '../transpilers/local.js';
import { global } from '../transpilers/global.js';
import { memory as memarg } from '../transpilers/memory.js';
import { indexes, wasmtypeInstance } from './wasmtype.js'
import { i64 as transpiler } from '../transpilers/i64.js'
import { f32 } from './f32.js';
import { i32 } from './i32.js';
import { f64, mergeUInt8Arrays } from './types.js';
import { usize } from './memory.js';
import { u32 } from '../transpilers/wasmtype.js';
import { parsers } from '@akala/protocol-parser';


export class i64 implements wasmtypeInstance<i64>
{
    public constructor(private initialOp: Uint8Array) { }

    public toOpCodes(): Uint8Array
    {
        return this.initialOp.slice(0);
    }

    public static readonly transpiler = transpiler;
    static Max_s = BigInt('0x7fffffffffffffff');
    static Min_s = BigInt('0x4000000000000000');
    static max_s = i64.const(this.Max_s);
    static min_s = i64.const(this.Min_s);
    static Max_u = BigInt(-1n);
    static Min_u = BigInt(0n);
    static max_u = i64.const(this.Max_u);
    static min_u = i64.const(this.Min_u);

    public static readonly type = transpiler.type
    public readonly type = i64
    public static readonly size = 64
    public static pop()
    {
        return new i64(new Uint8Array());
    }

    public static fromLocal(index: indexes.local) { return new i64(new Uint8Array([local.get, index])); }
    public teeLocal(index: indexes.local) { return new i64(new Uint8Array([local.tee, index])); }
    public static fromGlobal(index: indexes.global) { return new i64(new Uint8Array([global.get, index])); }

    private static signedParser = new parsers.SignedLEB128(8);

    public static const(value: bigint | u32)
    {
        if (!this.signedParser) this.signedParser = new parsers.SignedLEB128(8);
        // if (value >= 0)
        //     return new i64(mergeUInt8Arrays([0x42], ...this.unsignedParser.write(value)));
        return new i64(mergeUInt8Arrays([0x42], ...this.signedParser.write(value)));
    }

    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(3))); }
    public static load8_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_s], m.toOpCodes(3))); }
    public static load8_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_u], m.toOpCodes(3))); }
    public static load16_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_s], m.toOpCodes(3))); }
    public static load16_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_u], m.toOpCodes(3))); }
    public static load32_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load32_s], m.toOpCodes(3))); }
    public static load32_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load32_u], m.toOpCodes(3))); }

    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store], m.toOpCodes(3)); }
    public store8<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store8], m.toOpCodes(3)); }
    public store16<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store16], m.toOpCodes(3)); }
    public store32<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store32], m.toOpCodes(3)); }

    public wrap() { return new i32(mergeUInt8Arrays(this.initialOp, [i32.transpiler.wrap_i64])) }

    public eqz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.eqz]
        ))
    }
    public eq(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }
    public ne(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }
    public lt_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_s]
        ))
    }
    public lt_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_u]
        ))
    }
    public gt_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_s]
        ))
    }
    public gt_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_u]
        ))
    }
    public le_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_s]
        ))
    }
    public le_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_u]
        ))
    }
    public ge_s(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge_s]
        ))
    }
    public ge_u(rhs: i64)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge_u]
        ))
    }
    public clz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.clz]
        ))
    }
    public ctz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.ctz]
        ))
    }
    public popcnt()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.popcnt]
        ))
    }
    public add(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }
    public sub(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }
    public mul(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }
    public div_s(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_s]
        ))
    }
    public div_u(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_u]
        ))
    }
    public rem_s(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_s]
        ))
    }
    public rem_u(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_u]
        ))
    }
    public and(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.and]
        ))
    }
    public or(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.or]
        ))
    }
    public xor(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.xor]
        ))
    }
    public shl(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shl]
        ))
    }
    public shr_s(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shr_s]
        ))
    }
    public shr_u(rhs: i32)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.toOpCodes(),
            [transpiler.shr_u]
        ))
    }
    public rotl(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotl]
        ))
    }
    public rotr(rhs: i64)
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotr]
        ))
    }

    public reinterpret()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.reinterpret_i64]
        ))
    }

    public extend8_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend8_s]
        ))
    }
    public extend16_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend16_s]
        ))
    }
    public extend32_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend32_s]
        ))
    }

    public tof32_s()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i64_s]
        ))
    }
    public tof32_u()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i64_u]
        ))
    }
}

export const type = transpiler.type
