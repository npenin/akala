import { indexes, wasmtypeInstance } from './wasmtype.js'
import { memarg, memory } from './memory.js'
import { uint8 } from '@akala/protocol-parser';
import { v128 as transpiler } from '../transpilers/v128.js';
import { i32 as ni32 } from './i32.js';
import { i64 as ni64 } from './i64.js';
import { f32 as nf32 } from './f32.js';
import { f64 as nf64 } from './f64.js';
import { local } from '../transpilers/local.js';
import { global } from '../transpilers/global.js';
import { optional } from '@akala/protocol-parser/dist/parsers/index.js';
import { mergeUInt8Arrays } from './types.js';


export class v128 implements wasmtypeInstance<v128>
{
    public constructor(protected readonly initialOp: Uint8Array) { }

    toOpCodes(): Uint8Array
    {
        return this.initialOp.slice(0);
    }

    public static readonly type = transpiler.type
    public static readonly transpiler = transpiler;
    public readonly type = v128
    public static pop()
    {
        return new v128(new Uint8Array());
    }

    public static store<TNative extends bigint | number>(m: memarg<TNative>) { return [0xfd, 11, m]; }

    public static shuffle(values: indexes.lane[])
    {
        return [0xfd, 13,
            values];
    }

    public not(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.not
        ))
    }
    public and(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.and
        ))
    }
    public andnot(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.andnot
        ))
    }
    public or(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.or
        ))
    }
    public xor(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.xor
        ))
    }
    public bitselect(rhs: v128)
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            rhs.initialOp,
            transpiler.bitselect
        ))
    }
    public any_true()
    {
        return new v128(mergeUInt8Arrays(
            this.initialOp,
            transpiler.any_true
        ))
    }

}

export const type = v128.type


export namespace v128
{
    export class i8 extends v128
    {
        constructor(initialOp: Uint8Array)
        {
            super(initialOp);
        }

        public readonly type = i8
        public static pop()
        {
            return new i8(new Uint8Array());
        }

        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new i8(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new i8(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new i8(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new i8(new Uint8Array([global.get, index])); }

        public static const(values: uint8[] | Uint8Array) { return new i8(mergeUInt8Arrays(transpiler.const, values)); }

        public static load_s<TNative extends bigint | number>(m: memarg<TNative>) { return new i8(mergeUInt8Arrays(transpiler.i8.load_s, m.toOpCodes(8))); }
        public static load_u<TNative extends bigint | number>(m: memarg<TNative>) { return new i8(mergeUInt8Arrays(transpiler.i8.load_u, m.toOpCodes(8))); }
        public static load_splat<TNative extends bigint | number>(m: memarg<TNative>) { return new i8(mergeUInt8Arrays(transpiler.i8.load_splat, m.toOpCodes(8))); }
        public static load_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i8(mergeUInt8Arrays(transpiler.i8.load_lane, m.toOpCodes(8), [l])) }
        public store_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane)
        {
            return mergeUInt8Arrays(
                this.initialOp, transpiler.i8.store_lane, m.toOpCodes(8), [l]);
        }
        public extract_lane_s(l: indexes.lane)
        {
            return new ni32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i8.extract_lane_s(l)))
        }
        public extract_lane_u(l: indexes.lane)
        {
            return new ni32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i8.extract_lane_u(l)))
        }
        public replace_lane(l: indexes.lane) { return new i8(transpiler.i8.replace_lane(l)) }

        public swizzle()
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i8.swizzle))
        }
        public static splat(value: ni32)
        {
            return new i8(mergeUInt8Arrays(
                value.toOpCodes(),
                transpiler.i8.splat))
        }

        public eq(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.eq))
        }
        public ne(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.ne))
        }
        public lt_s(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.lt_s))
        }
        public lt_u(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.lt_u
            ))
        }
        public gt_s(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.gt_s))
        }
        public gt_u(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.gt_u
            ))
        }
        public le_s(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.le_s))
        }
        public le_u(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.le_u
            ))
        }
        public ge_s(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.ge_s))
        }
        public ge_u(rhs: v128)
        {
            return new v128(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.ge_u
            ))
        }

        public abs() { return new i8(transpiler.i8.abs); }
        public neg() { return new i8(transpiler.i8.neg); }
        public popcnt() { return new i8(transpiler.i8.popcnt); }
        public all_true() { return new i8(transpiler.i8.all_true); }
        public bitmask() { return new i8(transpiler.i8.bitmask); }
        public shl(amount: ni32)
        {
            return new i8(mergeUInt8Arrays(
                amount.toOpCodes(),
                transpiler.i8.shl));
        }
        public shr_sat_s(amount: ni32)
        {
            return new i8(mergeUInt8Arrays(
                amount.toOpCodes(),
                transpiler.i8.shr_sat_s));
        }
        public shr_sat_u(amount: ni32)
        {
            return new i8(mergeUInt8Arrays(
                amount.toOpCodes(),
                transpiler.i8.shr_sat_u
            ));
        }
        public add(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.add));
        }
        public add_sat_s(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.add_sat_s));
        }
        public add_sat_u(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.add_sat_u
            ));
        }
        public sub(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.sub));
        }
        public sub_sat_s(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.sub_sat_s));
        }
        public sub_sat_u(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.sub_sat_u
            ));
        }
        public min_s(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.min_s));
        }
        public min_u(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.min_u
            ));
        }
        public max_s(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.max_s));
        }
        public max_u(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.max_u
            ));
        }
        public avgr_u(rhs: v128)
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i8.avgr_u
            ));
        }

        public extadd_pairwise_s()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extadd_pairwise_s))
        }
        public extadd_pairwise_u()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extadd_pairwise_u
            ))
        }

    };

    export class i16 extends v128
    {
        constructor(initialOp: Uint8Array)
        {
            super(initialOp);
        }
        public readonly type = i16
        public static pop()
        {
            return new i16(new Uint8Array());
        }

        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new i16(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new i16(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new i16(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new i16(new Uint8Array([global.get, index])); }

        public static const(values: uint8[]) { return new i16(mergeUInt8Arrays(transpiler.const, values)); }

        public static load_s<TNative extends bigint | number>(m: memarg<TNative>) { return new i16(mergeUInt8Arrays(transpiler.i16.load_s, m.toOpCodes(8))); }
        public static load_u<TNative extends bigint | number>(m: memarg<TNative>) { return new i16(mergeUInt8Arrays(transpiler.i16.load_u, m.toOpCodes(8))); }
        public static load_splat<TNative extends bigint | number>(m: memarg<TNative>) { return new i16(mergeUInt8Arrays(transpiler.i16.load_splat, m.toOpCodes(8))); }
        public load_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i16(mergeUInt8Arrays(transpiler.i16.load_lane, m.toOpCodes(8), [l])); }
        public store_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i16(mergeUInt8Arrays(transpiler.i16.store_lane, m.toOpCodes(8), [l])); }
        public extract_lane_s(l: indexes.lane)
        {
            return new ni32(mergeUInt8Arrays(this.initialOp,
                transpiler.i16.extract_lane_s(l)));
        }
        public extract_lane_u(l: indexes.lane)
        {
            return new ni32(mergeUInt8Arrays(this.initialOp,
                transpiler.i16.extract_lane_u(l)));
        }
        public replace_lane(l: indexes.lane, value: ni32)
        {
            return new i16(mergeUInt8Arrays(this.initialOp,
                value.toOpCodes(),
                transpiler.i16.replace_lane(l)));
        }

        public static splat(value: ni32)
        {
            return new i16(mergeUInt8Arrays(value.toOpCodes(),
                transpiler.i16.splat))
        }

        public eq(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.eq
            ))
        }
        public ne(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.ne
            ))
        }
        public lt_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.lt_s
            ))
        }
        public lt_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.lt_u
            ))
        }
        public gt_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.gt_s
            ))
        }
        public gt_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.gt_u
            ))
        }
        public le_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.le_s
            ))
        }
        public le_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.le_u
            ))
        }
        public ge_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.ge_s
            ))
        }
        public ge_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.ge_u
            ))
        }

        public abs()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.abs
            ))
        }
        public neg()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.neg
            ))
        }

        public q15mulr_sat_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.q15mulr_sat_s
            ))
        }
        public all_true()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.all_true
            ))
        }
        public bitmask()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.bitmask
            ))
        }

        public narrow_s()
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i8.narrow_i16x8_s
            ));
        }
        public narrow_u()
        {
            return new i8(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i8.narrow_i16x8_u
            ));
        }

        public extend_low_s()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extend_low_s
            ))
        }
        public extend_high_s()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extend_high_s
            ))
        }
        public extend_low_u()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extend_low_u
            ))
        }
        public extend_high_u()
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i16.extend_high_u
            ))
        }
        public shl(rhs: ni32)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.shl
            ))
        }
        public shr_s(rhs: ni32)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.shr_s
            ))
        }
        public shr_u(rhs: ni32)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.shr_u
            ))
        }
        public add(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.add
            ))
        }
        public add_sat_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.add_sat_s
            ))
        }
        public add_sat_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.add_sat_u
            ))
        }
        public sub(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.sub
            ))
        }
        public sub_sat_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.sub_sat_s
            ))
        }
        public sub_sat_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.sub_sat_u
            ))
        }
        public mul(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.mul
            ))
        }
        public min_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.min_s
            ))
        }
        public min_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.min_u
            ))
        }
        public max_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.max_s
            ))
        }
        public max_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.max_u
            ))
        }
        public avgr_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.avgr_u
            ))
        }
        public extmul_low_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.extmul_low_s
            ))
        }
        public extmul_high_s(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.extmul_high_s
            ))
        }
        public extmul_low_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.extmul_low_u
            ))
        }
        public extmul_high_u(rhs: v128)
        {
            return new i16(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i16.extmul_high_u
            ))
        }
    };

    export class i32 extends v128
    {
        public readonly type = i32
        public static pop()
        {
            return new i32(new Uint8Array());
        }

        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new i32(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new i32(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new i32(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new i32(new Uint8Array([global.get, index])); }

        public static const(values: uint8[]) { return new i8(mergeUInt8Arrays(transpiler.const, values)); }
        public static load_s<TNative extends bigint | number>(m: memarg<TNative>) { return new i32(mergeUInt8Arrays(transpiler.i32.load_s, m.toOpCodes(8))); }
        public static load_u<TNative extends bigint | number>(m: memarg<TNative>) { return new i32(mergeUInt8Arrays(transpiler.i32.load_u, m.toOpCodes(8))); }
        public static load_splat<TNative extends bigint | number>(m: memarg<TNative>) { return new i32(mergeUInt8Arrays(transpiler.i32.load_splat, m.toOpCodes(8))); }
        public static load_zero<TNative extends bigint | number>(m: memarg<TNative>) { return new i32(mergeUInt8Arrays(transpiler.i32.load_zero, m.toOpCodes(8))); }
        public load_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i32(mergeUInt8Arrays(transpiler.i32.load_lane, m.toOpCodes(8), [l])) }
        public store_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i32(mergeUInt8Arrays(transpiler.i32.store_lane, m.toOpCodes(8), [l])) }
        public extract_lane(l: indexes.lane)
        {
            return new ni32(mergeUInt8Arrays(this.initialOp,
                transpiler.i32.extract_lane(l)))
        }
        public replace_lane(l: indexes.lane, value: ni32)
        {
            return new i32(mergeUInt8Arrays(this.initialOp,
                value.toOpCodes(),
                transpiler.i32.replace_lane(l)))
        }

        public static splat(value: ni32)
        {
            return new i32(mergeUInt8Arrays(value.toOpCodes(),
                transpiler.i32.splat))
        }

        public eq(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.eq
            ))
        }
        public ne(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.ne
            ))
        }
        public lt_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.lt_s
            ))
        }
        public lt_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.lt_u
            ))
        }
        public gt_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.gt_s
            ))
        }
        public gt_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.gt_u
            ))
        }
        public le_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.le_s
            ))
        }
        public le_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.le_u
            ))
        }
        public ge_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.ge_s
            ))
        }
        public ge_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.ge_u
            ))
        }


        public extadd_pairwise_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extadd_pairwise_s
            ))
        }
        public extadd_pairwise_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extadd_pairwise_u
            ))
        }
        public abs(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.abs
            ))
        }
        public neg(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.neg
            ))
        }
        // public static readonly q15mulr_sat_s = [0xfd, 162]
        public all_true()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.all_true
            ))
        }
        public bitmask()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.bitmask
            ))
        }
        public extend_low_s()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.extend_low_s
            ))
        }
        public extend_high_s()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.extend_high_s
            ))
        }
        public extend_low_u()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.extend_low_u
            ))
        }
        public extend_high_u()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.extend_high_u
            ))
        }
        public shl(amount: ni32)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i32.shl
            ))
        }
        public shr_s(amount: ni32)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i32.shr_s
            ))
        }
        public shr_u(amount: ni32)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i32.shr_u
            ))
        }
        public add(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.add
            ))
        }
        public sub(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.sub
            ))
        }
        public mul(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.mul
            ))
        }
        public min_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.min_s
            ))
        }
        public min_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.min_u
            ))
        }
        public max_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.max_s
            ))
        }
        public max_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.max_u
            ))
        }
        public avgr_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.avgr_u
            ))
        }
        public extmul_low_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extmul_low_s
            ))
        }
        public extmul_high_s(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extmul_high_s
            ))
        }
        public extmul_low_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extmul_low_u
            ))
        }
        public extmul_high_u(rhs: v128)
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i32.extmul_high_u
            ))
        }

        public convert_s()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.convert_i32_s
            ))
        }
        public convert_u()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.convert_i32_u
            ))
        }

        public convert_low_s()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.convert_low_i32_s
            ))
        }
        public convert_low_u()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.convert_low_i32_u
            ))
        }

    };

    export class i64 extends v128 implements wasmtypeInstance<i64>
    {
        public readonly type = i64
        public static pop()
        {
            return new i64(new Uint8Array());
        }

        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new i64(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new i64(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new i64(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new i64(new Uint8Array([global.get, index])); }

        public static load_splat<TNative extends bigint | number>(m: memarg<TNative>) { return new i64(mergeUInt8Arrays(transpiler.i64.load_splat, m.toOpCodes(8))); }
        public static load_zero<TNative extends bigint | number>(m: memarg<TNative>) { return new i64(mergeUInt8Arrays(transpiler.i64.load_zero, m.toOpCodes(8))); }
        public load_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i64(mergeUInt8Arrays(transpiler.i64.load_lane, m.toOpCodes(8), [l])) }
        public store_lane<TNative extends bigint | number>(m: memarg<TNative>, l: indexes.lane) { return new i64(mergeUInt8Arrays(transpiler.i64.store_lane, m.toOpCodes(8), [l])) }
        public extract_lane(l: indexes.lane)
        {
            return new ni64(mergeUInt8Arrays(this.initialOp,
                transpiler.i64.extract_lane(l)))
        }
        public replace_lane(l: indexes.lane, value: ni64)
        {
            return new i64(mergeUInt8Arrays(this.initialOp,
                value.toOpCodes(),
                transpiler.i64.replace_lane(l)))
        }

        public static splat(value: ni32)
        {
            return new i32(mergeUInt8Arrays(value.toOpCodes(),
                transpiler.i32.splat))
        }

        public eq(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.eq
            ))
        }
        public ne(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.ne
            ))
        }
        public lt_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.lt_s
            ))
        }
        public gt_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.gt_s
            ))
        }
        public le_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.le_s
            ))
        }
        public ge_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.ge_s
            ))
        }

        public abs()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.abs
            ))
        }
        public neg()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.neg
            ))
        }
        // public static readonly q15mulr_sat_s = [0xfd,  194]
        public all_true()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.all_true
            ))
        }
        public bitmask()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.bitmask
            ))
        }
        public extend_low_s()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.extend_low_s
            ))
        }
        public extend_high_s()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.extend_high_s
            ))
        }
        public extend_low_u()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.extend_low_u
            ))
        }
        public extend_high_u()
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i64.extend_high_u
            ))
        }
        public shl(amount: ni32)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i64.shl
            ))
        }
        public shr_s(amount: ni32)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i64.shr_s
            ))
        }
        public shr_u(amount: ni32)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                amount.toOpCodes(),
                transpiler.i64.shr_u
            ))
        }
        public add(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.add
            ))
        }
        public sub(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.sub
            ))
        }
        public mul(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.mul
            ))
        }
        public extmul_low_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.extmul_low_s
            ))
        }
        public extmul_high_s(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.extmul_high_s
            ))
        }
        public extmul_low_u(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.extmul_low_u
            ))
        }
        public extmul_high_u(rhs: v128)
        {
            return new i64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.i64.extmul_high_u
            ))
        }
    };

    export class f32 extends v128
    {
        public readonly type = f32
        public static pop()
        {
            return new f32(new Uint8Array());
        }
        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new f32(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new f32(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new f32(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new f32(new Uint8Array([global.get, index])); }

        public extract_lane(l: indexes.lane)
        {
            return new nf32(mergeUInt8Arrays(this.initialOp,
                transpiler.f32.extract_lane(l)))
        }
        public replace_lane(l: indexes.lane, value: nf32)
        {
            return new f32(mergeUInt8Arrays(this.initialOp,
                value.toOpCodes(),
                transpiler.f32.replace_lane(l)))
        }

        public static splat(value: nf32)
        {
            return new f32(mergeUInt8Arrays(value.toOpCodes(),
                transpiler.f32.splat))
        }

        public eq(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.eq
            ))
        }
        public ne(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.ne
            ))
        }
        public lt_s(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.lt_s
            ))
        }
        public gt_s(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.gt_s
            ))
        }
        public le_s(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.le_s
            ))
        }
        public ge_s(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.ge_s
            ))
        }

        public ceil()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.ceil
            ))
        }
        public floor()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.floor
            ))
        }
        public trunc()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.trunc
            ))
        }
        public nearest()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.nearest
            ))
        }
        public abs()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.abs
            ))
        }
        public neg()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.neg
            ))
        }
        public sqrt()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.sqrt
            ))
        }
        public add(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.add
            ))
        }
        public sub(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.sub
            ))
        }
        public mul(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.mul
            ))
        }
        public div(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.div
            ))
        }
        public min(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.min
            ))
        }
        public max(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.max
            ))
        }
        public pmin(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.pmin
            ))
        }
        public pmax(rhs: v128)
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f32.pmax
            ))
        }

        public promote_low()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.promote_low_f32
            ))
        }

        public trunc_sat_s()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.trunc_sat_f32_s
            ))
        }
        public trunc_sat_u()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.trunc_sat_f32_u
            ))
        }


    };

    export class f64 extends v128
    {
        public readonly type = f64
        public static pop()
        {
            return new f64(new Uint8Array());
        }
        public static load<TNative extends bigint | number>(m: memarg<TNative>) { return new f64(mergeUInt8Arrays(transpiler.load, m.toOpCodes(8))); }
        public static fromLocal(index: indexes.local) { return new f64(new Uint8Array([local.get, index])); }
        public teeLocal(index: indexes.local) { return new f64(new Uint8Array([local.tee, index])); }
        public static fromGlobal(index: indexes.global) { return new f64(new Uint8Array([global.get, index])); }

        public extract_lane(l: indexes.lane)
        {
            return new nf64(mergeUInt8Arrays(this.initialOp,
                transpiler.f64.extract_lane(l)))
        }
        public replace_lane(l: indexes.lane, value: nf32)
        {
            return new f64(mergeUInt8Arrays(this.initialOp,
                value.toOpCodes(),
                transpiler.f64.replace_lane(l)))
        }

        public static splat(value: nf64)
        {
            return new f64(mergeUInt8Arrays(value.toOpCodes(),
                transpiler.f64.splat))
        }

        public eq(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.eq
            ))
        }
        public ne(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.ne
            ))
        }
        public lt_s(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.lt_s
            ))
        }
        public gt_s(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.gt_s
            ))
        }
        public le_s(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.le_s
            ))
        }
        public ge_s(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.ge_s
            ))
        }

        public ceil()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.ceil
            ))
        }
        public floor()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.floor
            ))
        }
        public trunc()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.trunc
            ))
        }
        public nearest()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.nearest
            ))
        }
        public abs()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.abs
            ))
        }
        public neg()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.neg
            ))
        }
        public sqrt()
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f64.sqrt
            ))
        }
        public add(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.add
            ))
        }
        public sub(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.sub
            ))
        }
        public mul(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.mul
            ))
        }
        public div(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.div
            ))
        }
        public min(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.min
            ))
        }
        public max(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.max
            ))
        }
        public pmin(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.pmin
            ))
        }
        public pmax(rhs: v128)
        {
            return new f64(mergeUInt8Arrays(
                this.initialOp,
                rhs.toOpCodes(),
                transpiler.f64.pmax
            ))
        }

        public demote_zero()
        {
            return new f32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.f32.demote_f64_zero
            ))
        }

        public trunc_sat_s_zero()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.trunc_sat_f64_s_zero
            ))
        }
        public trunc_sat_u_zero()
        {
            return new i32(mergeUInt8Arrays(
                this.initialOp,
                transpiler.i32.trunc_sat_f64_u_zero
            ))
        }
    };
}