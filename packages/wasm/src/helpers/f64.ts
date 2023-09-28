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


export class f64 implements wasmtypeInstance<f64>
{
    public constructor(private initialOp: Uint8Array) { }

    toOpCodes(): Uint8Array
    {
        return this.initialOp.slice(0)
    }

    public static readonly type = transpiler.type;
    public readonly type = f64;
    public static pop()
    {
        return new f64(new Uint8Array());
    }

    public static readonly transpiler = transpiler;
    public static fromLocal(index: indexes.local) { return new f32(new Uint8Array([local.get, index])); }
    public teeLocal(index: indexes.local) { return new f32(new Uint8Array([local.tee, index])); }
    public static fromGlobal(index: indexes.global) { return new f32(global.get(index)); }

    public static const(value: number)
    {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeDoubleLE(value, 0);
        return new f64(new Uint8Array([transpiler.const, buffer.readUint8(0), buffer.readUint8(1), buffer.readUint8(2), buffer.readUint8(3), buffer.readUint8(4), buffer.readUint8(5), buffer.readUint8(6), buffer.readUint8(7)]));
    }

    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new f64(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(3))); }
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(3)); }

    public eq(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }
    public ne(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }
    public lt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt]
        ))
    }
    public gt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt]
        ))
    }
    public le(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le]
        ))
    }
    public ge(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge]
        ))
    }
    public abs(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.abs]
        ))
    }
    public neg(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.neg]
        ))
    }
    public ceil(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ceil]
        ))
    }
    public floor(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.floor]
        ))
    }
    public trunc(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.trunc]
        ))
    }
    public nearest(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.nearest]
        ))
    }
    public sqrt(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sqrt]
        ))
    }
    public add(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }
    public sub(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }
    public mul(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }
    public div(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div]
        ))
    }
    public min(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.min]
        ))
    }
    public max(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.max]
        ))
    }
    public copysign(rhs: f64)
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.copysign]
        ))
    }


    public reinterpret()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.reinterpret_f64]
        ))
    }

    public demote()
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            [f32.transpiler.demote_f64]
        ))
    }

    public trunc_sat_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f64_s
        ))
    }
    public trunc_sat_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f64_u
        ))
    }
    public trunc32_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f64_s]
        ))
    }
    public trunc32_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f64_u]
        ))
    }

    public trunc64_s()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f64_s]
        ))
    }
    public trunc64_u()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f64_u]
        ))
    }

}

export const type = f64.type
