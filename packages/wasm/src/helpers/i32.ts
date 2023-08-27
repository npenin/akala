import { indexes, wasmtypeInstance } from './wasmtype.js'
import { memory as memarg } from '../transpilers/memory.js'
import { local } from '../transpilers/local.js';
import { i32 as transpiler } from '../transpilers/i32.js'
import { f32 } from './f32.js';
import { i64 } from './i64.js';
import { f64 } from './f64.js';
import { global } from '../transpilers/global.js'
import { usize } from './memory.js';
import { mergeUInt8Arrays } from './types.js';
import { u32 } from '../transpilers/wasmtype.js';
import { parsers } from '@akala/protocol-parser';

export class i32 implements wasmtypeInstance<i32>
{
    public constructor(private initialOp: Uint8Array) { }

    public toOpCodes(): Uint8Array
    {
        return this.initialOp.slice(0);
    }

    public static readonly size = 32;

    public static readonly transpiler = transpiler;

    public static Max_u = -1;
    public static Max_s = 0x7fffffff;
    public static Min_u = 0x0;
    public static Min_s = 0x80000000;

    public static max_u = i32.const(this.Max_u);
    public static max_s = i32.const(this.Max_s);
    public static min_u = i32.const(this.Min_u);
    public static min_s = i32.const(this.Min_s);


    public static readonly type = 0x7f
    public readonly type = i32;
    public static pop()
    {
        return new i32(new Uint8Array());
    }

    public static fromLocal(index: indexes.local) { return new i32(new Uint8Array([local.get, index])); }
    public teeLocal(index: indexes.local) { return new i32(mergeUInt8Arrays(this.initialOp, [local.tee, index])); }
    public static fromGlobal(index: indexes.global) { return new i32(new Uint8Array([global.get, index])); }

    public static const(value: number)
    {
        // if (value >= 0)
        //     return new i32(mergeUInt8Arrays([transpiler.const], ...parsers.unsignedLEB128.write(value)));
        return new i32(mergeUInt8Arrays([transpiler.const], ...parsers.signedLEB128.write(value)));
    }

    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(2))); }
    public static load8_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_s], m.toOpCodes(0))); }
    public static load8_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load8_u], m.toOpCodes(0))); }
    public static load16_s<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_s], m.toOpCodes(1))); }
    public static load16_u<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new i32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load16_u], m.toOpCodes(1))); }

    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store], m.toOpCodes(2)); }
    public store8<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store8], m.toOpCodes(0)); }
    public store16<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(this.initialOp, offset.toOpCodes(), [transpiler.store16], m.toOpCodes(1)); }

    public eqz()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.eqz]
        ))
    }
    public eq(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }
    public ne(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }
    public lt_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_s]
        ))
    }
    public lt_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt_u]
        ))
    }
    public gt_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_s]
        ))
    }
    public gt_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt_u]
        ))
    }
    public le_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_s]
        ))
    }
    public le_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le_u]
        ))
    }
    public ge_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge_s]
        ))
    }
    public ge_u(rhs: i32)
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
    public add(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }
    public sub(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }
    public mul(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }
    public div_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_s]
        ))
    }
    public div_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div_u]
        ))
    }
    public rem_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_s]
        ))
    }
    public rem_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rem_u]
        ))
    }
    public and(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.and]
        ))
    }
    public or(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.or]
        ))
    }
    public xor(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.xor]
        ))
    }
    public shl(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.shl]
        ))
    }
    public shr_s(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.shr_s]
        ))
    }
    public shr_u(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.shr_u]
        ))
    }
    public rotl(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotl]
        ))
    }
    public rotr(rhs: i32)
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.rotr]
        ))
    }

    public extend8_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend8_s]
        ))
    }
    public extend16_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [transpiler.extend16_s]
        ))
    }

    /** f32.reinterpret_i32 */
    public tof32()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.reinterpret_i32]
        ))
    }

    public extend_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.extend_i32_s]
        ))
    }
    public extend_u()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.extend_i32_u]
        ))
    }

    public tof64_s()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.convert_i32_s]
        ))
    }
    public tof64_u()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.convert_i32_u]
        ))
    }

    public convert_s()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i32_s]
        ))
    }
    public convert_u()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.convert_i32_u]
        ))
    }

}