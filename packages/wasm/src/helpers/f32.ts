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

export class f32 implements wasmtypeInstance<f32>
{
    public constructor(private initialOp: Uint8Array) { }

    toOpCodes(): Uint8Array
    {
        return this.initialOp;
    }

    public static readonly type = transpiler.type;
    public readonly type = f32;
    public static pop()
    {
        return new f32(new Uint8Array());
    }

    public static readonly transpiler = transpiler;
    public static fromLocal(index: indexes.local) { return new f32(new Uint8Array([local.get, index])); }
    public teeLocal(index: indexes.local) { return new f32(new Uint8Array([local.tee, index])); }
    public static fromGlobal(index: indexes.global) { return new f32(new Uint8Array(global.get(index))); }

    public static const(value: number)
    {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeFloatLE(value, 0);
        return new f32(new Uint8Array([transpiler.const, buffer.readUint8(0), buffer.readUint8(1), buffer.readUint8(2), buffer.readUint8(3)]));
    }

    public static load<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return new f32(mergeUInt8Arrays(offset.toOpCodes(), [transpiler.load], m.toOpCodes(2))); }
    public store<TNative extends bigint | u32>(m: memarg<TNative>, offset: usize<TNative>) { return mergeUInt8Arrays(offset.toOpCodes(), this.initialOp, [transpiler.store], m.toOpCodes(2)); }

    public eq(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.eq]
        ))
    }
    public ne(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ne]
        ))
    }
    public lt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.lt]
        ))
    }
    public gt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.gt]
        ))
    }
    public le(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.le]
        ))
    }
    public ge(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ge]
        ))
    }
    public abs(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.abs]
        ))
    }
    public neg(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.neg]
        ))
    }
    public ceil(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.ceil]
        ))
    }
    public floor(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.floor]
        ))
    }
    public trunc(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.trunc]
        ))
    }
    public nearest(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.nearest]
        ))
    }
    public sqrt(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sqrt]
        ))
    }
    public add(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.add]
        ))
    }
    public sub(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.sub]
        ))
    }
    public mul(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.mul]
        ))
    }
    public div(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.div]
        ))
    }
    public min(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.min]
        ))
    }
    public max(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.max]
        ))
    }
    public copysign(rhs: f32)
    {
        return new f32(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            [transpiler.copysign]
        ))
    }

    public reinterpret()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.reinterpret_f32]
        ))
    }

    public toi32()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f32_s]
        ))
    }
    public tou32()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            [i32.transpiler.trunc_f32_u]
        ))
    }

    public toi64()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f32_s]
        ))
    }
    public tou64()
    {
        return new i64(mergeUInt8Arrays(
            this.initialOp,
            [i64.transpiler.trunc_f32_u]
        ))
    }

    public promote()
    {
        return new f64(mergeUInt8Arrays(
            this.initialOp,
            [f64.transpiler.promote_f32]
        ))
    }

    public trunc_sat_s()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f32_s
        ))
    }
    public trunc_sat_u()
    {
        return new i32(mergeUInt8Arrays(
            this.initialOp,
            i32.transpiler.trunc_sat_f32_u
        ))
    }

}