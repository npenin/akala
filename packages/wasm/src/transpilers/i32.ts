import { wasmtype } from './wasmtype.js'
import { memory } from './memory.js'

export class i32 implements wasmtype<i32>
{
    public constructor() { }

    public static readonly type = 0x7f

    public static readonly const = 0x41;
    public static readonly load = 0x28;
    public static readonly load8_s = 0x2c;
    public static readonly load8_u = 0x2d;
    public static readonly load16_s = 0x2e;
    public static readonly load16_u = 0x2f;

    public static readonly store = 0x36;
    public static readonly store8 = 0x3a;
    public static readonly store16 = 0x3b;

    public static readonly eqz = 0x45;
    public static readonly eq = 0x46;
    public static readonly ne = 0x47;
    public static readonly lt_s = 0x48;
    public static readonly lt_u = 0x49;
    public static readonly gt_s = 0x4a;
    public static readonly gt_u = 0x4b;
    public static readonly le_s = 0x4c;
    public static readonly le_u = 0x4d;
    public static readonly ge_s = 0x4e;
    public static readonly ge_u = 0x4f;
    public static readonly clz = 0x67
    public static readonly ctz = 0x68
    public static readonly popcnt = 0x69
    public static readonly add = 0x6a
    public static readonly sub = 0x6b
    public static readonly mul = 0x6c
    public static readonly div_s = 0x6d
    public static readonly div_u = 0x6e
    public static readonly rem_s = 0x6f
    public static readonly rem_u = 0x70
    public static readonly and = 0x71
    public static readonly or = 0x72
    public static readonly xor = 0x73
    public static readonly shl = 0x74
    public static readonly shr_s = 0x75
    public static readonly shr_u = 0x76
    public static readonly rotl = 0x77
    public static readonly rotr = 0x78
    public static readonly wrap_i64 = 0xa7

    public static readonly reinterpret_f32 = 0xbc
    public static readonly extend8_s = 0xc0
    public static readonly extend16_s = 0xc1

    public static readonly trunc_f32_s = 0xa8
    public static readonly trunc_f32_u = 0xa9
    public static readonly trunc_f64_s = 0xaa
    public static readonly trunc_f64_u = 0xab
    public static readonly trunc_sat_f32_s = [0xfc, 0]
    public static readonly trunc_sat_f32_u = [0xfc, 1]
    public static readonly trunc_sat_f64_s = [0xfc, 2]
    public static readonly trunc_sat_f64_u = [0xfc, 3]
}

export const type = i32.type;
