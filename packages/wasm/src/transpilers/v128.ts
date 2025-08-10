import { IsomorphicBuffer } from '@akala/core';
import { type indexes } from './wasmtype.js'


export class v128 
{
    private constructor() { }

    public static readonly type = 0x7b

    public static readonly load = [0xfd, 0];
    public static readonly store = [0xfd, 11];

    public static readonly const = [0xfd, 12]
    public static readonly shuffle = [0xfd, 13];

    public static readonly not = new IsomorphicBuffer([0xfd, 77]);
    public static readonly and = new IsomorphicBuffer([0xfd, 78]);
    public static readonly andnot = new IsomorphicBuffer([0xfd, 79]);
    public static readonly or = new IsomorphicBuffer([0xfd, 80]);
    public static readonly xor = new IsomorphicBuffer([0xfd, 81]);
    public static readonly bitselect = new IsomorphicBuffer([0xfd, 82]);
    public static readonly any_true = new IsomorphicBuffer([0xfd, 83]);

}

export const type = v128.type


export namespace v128
{
    export class i8
    {
        public static load_s = [0xfd, 1];
        public static load_u = [0xfd, 2];
        public static load_splat = [0xfd, 7];
        public static load_lane = [0xfd, 84];
        public static store_lane = [0xfd, 88];
        public static extract_lane_s(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 21, l]); }
        public static extract_lane_u(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 22, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 23, l]); }

        public static readonly swizzle = new IsomorphicBuffer([0xfd, 14])
        public static readonly splat = new IsomorphicBuffer([0xfd, 15])

        public static readonly eq = new IsomorphicBuffer([0xfd, 35])
        public static readonly ne = new IsomorphicBuffer([0xfd, 36])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 37])
        public static readonly lt_u = new IsomorphicBuffer([0xfd, 38])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 39])
        public static readonly gt_u = new IsomorphicBuffer([0xfd, 40])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 41])
        public static readonly le_u = new IsomorphicBuffer([0xfd, 42])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 43])
        public static readonly ge_u = new IsomorphicBuffer([0xfd, 44])

        public static readonly abs = new IsomorphicBuffer([0xfd, 96])
        public static readonly neg = new IsomorphicBuffer([0xfd, 97])
        public static readonly popcnt = new IsomorphicBuffer([0xfd, 98])
        public static readonly all_true = new IsomorphicBuffer([0xfd, 99])
        public static readonly bitmask = new IsomorphicBuffer([0xfd, 100])
        public static readonly narrow_i16x8_s = new IsomorphicBuffer([0xfd, 101])
        public static readonly narrow_i16x8_u = new IsomorphicBuffer([0xfd, 102])
        public static readonly shl = new IsomorphicBuffer([0xfd, 107])
        public static readonly shr_sat_s = new IsomorphicBuffer([0xfd, 108])
        public static readonly shr_sat_u = new IsomorphicBuffer([0xfd, 109])
        public static readonly add = new IsomorphicBuffer([0xfd, 110])
        public static readonly add_sat_s = new IsomorphicBuffer([0xfd, 111])
        public static readonly add_sat_u = new IsomorphicBuffer([0xfd, 112])
        public static readonly sub = new IsomorphicBuffer([0xfd, 113])
        public static readonly sub_sat_s = new IsomorphicBuffer([0xfd, 114])
        public static readonly sub_sat_u = new IsomorphicBuffer([0xfd, 115])
        public static readonly min_s = new IsomorphicBuffer([0xfd, 118])
        public static readonly min_u = new IsomorphicBuffer([0xfd, 119])
        public static readonly max_s = new IsomorphicBuffer([0xfd, 120])
        public static readonly max_u = new IsomorphicBuffer([0xfd, 121])
        public static readonly avgr_u = new IsomorphicBuffer([0xfd, 123])

    };

    export class i16
    {
        public static load_s = [0xfd, 3];
        public static load_u = [0xfd, 4];
        public static load_splat = [0xfd, 8];
        public static load_lane = [0xfd, 85];
        public static store_lane = [0xfd, 89];
        public static extract_lane_s(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 24, l]); }
        public static extract_lane_u(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 25, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 26, l]); }

        public static readonly splat = new IsomorphicBuffer([0xfd, 16])

        public static readonly eq = new IsomorphicBuffer([0xfd, 45])
        public static readonly ne = new IsomorphicBuffer([0xfd, 46])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 47])
        public static readonly lt_u = new IsomorphicBuffer([0xfd, 48])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 49])
        public static readonly gt_u = new IsomorphicBuffer([0xfd, 50])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 51])
        public static readonly le_u = new IsomorphicBuffer([0xfd, 52])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 53])
        public static readonly ge_u = new IsomorphicBuffer([0xfd, 54])

        public static readonly extadd_pairwise_s = new IsomorphicBuffer([0xfd, 124])
        public static readonly extadd_pairwise_u = new IsomorphicBuffer([0xfd, 125])
        public static readonly abs = new IsomorphicBuffer([0xfd, 128])
        public static readonly neg = new IsomorphicBuffer([0xfd, 129])
        public static readonly q15mulr_sat_s = new IsomorphicBuffer([0xfd, 130])
        public static readonly all_true = new IsomorphicBuffer([0xfd, 131])
        public static readonly bitmask = new IsomorphicBuffer([0xfd, 132])
        public static readonly narrow_i32x4_s = new IsomorphicBuffer([0xfd, 133])
        public static readonly narrow_i32x4_u = new IsomorphicBuffer([0xfd, 134])
        public static readonly extend_low_s = new IsomorphicBuffer([0xfd, 135])
        public static readonly extend_high_s = new IsomorphicBuffer([0xfd, 136])
        public static readonly extend_low_u = new IsomorphicBuffer([0xfd, 137])
        public static readonly extend_high_u = new IsomorphicBuffer([0xfd, 138])
        public static readonly shl = new IsomorphicBuffer([0xfd, 139])
        public static readonly shr_s = new IsomorphicBuffer([0xfd, 140])
        public static readonly shr_u = new IsomorphicBuffer([0xfd, 141])
        public static readonly add = new IsomorphicBuffer([0xfd, 142])
        public static readonly add_sat_s = new IsomorphicBuffer([0xfd, 143])
        public static readonly add_sat_u = new IsomorphicBuffer([0xfd, 144])
        public static readonly sub = new IsomorphicBuffer([0xfd, 145])
        public static readonly sub_sat_s = new IsomorphicBuffer([0xfd, 146])
        public static readonly sub_sat_u = new IsomorphicBuffer([0xfd, 147])
        public static readonly mul = new IsomorphicBuffer([0xfd, 149])
        public static readonly min_s = new IsomorphicBuffer([0xfd, 150])
        public static readonly min_u = new IsomorphicBuffer([0xfd, 151])
        public static readonly max_s = new IsomorphicBuffer([0xfd, 152])
        public static readonly max_u = new IsomorphicBuffer([0xfd, 153])
        public static readonly avgr_u = new IsomorphicBuffer([0xfd, 155])
        public static readonly extmul_low_s = new IsomorphicBuffer([0xfd, 156])
        public static readonly extmul_high_s = new IsomorphicBuffer([0xfd, 158])
        public static readonly extmul_low_u = new IsomorphicBuffer([0xfd, 157])
        public static readonly extmul_high_u = new IsomorphicBuffer([0xfd, 159])
    };

    export class i32
    {
        public static load_s = [0xfd, 5];
        public static load_u = [0xfd, 6];
        public static load_splat = [0xfd, 9];
        public static load_zero = [0xfd, 92];
        public static load_lane = [0xfd, 86];
        public static store_lane = [0xfd, 90];
        public static extract_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 27, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 28, l]); }

        public static readonly splat = new IsomorphicBuffer([0xfd, 17])

        public static readonly eq = new IsomorphicBuffer([0xfd, 55])
        public static readonly ne = new IsomorphicBuffer([0xfd, 56])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 57])
        public static readonly lt_u = new IsomorphicBuffer([0xfd, 58])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 59])
        public static readonly gt_u = new IsomorphicBuffer([0xfd, 60])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 61])
        public static readonly le_u = new IsomorphicBuffer([0xfd, 62])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 63])
        public static readonly ge_u = new IsomorphicBuffer([0xfd, 64])


        public static readonly extadd_pairwise_s = new IsomorphicBuffer([0xfd, 126])
        public static readonly extadd_pairwise_u = new IsomorphicBuffer([0xfd, 127])
        public static readonly abs = new IsomorphicBuffer([0xfd, 160])
        public static readonly neg = new IsomorphicBuffer([0xfd, 161])
        // public static readonly q15mulr_sat_s = [0xfd, 162]
        public static readonly all_true = new IsomorphicBuffer([0xfd, 163])
        public static readonly bitmask = new IsomorphicBuffer([0xfd, 164])
        public static readonly extend_low_s = new IsomorphicBuffer([0xfd, 167])
        public static readonly extend_high_s = new IsomorphicBuffer([0xfd, 168])
        public static readonly extend_low_u = new IsomorphicBuffer([0xfd, 169])
        public static readonly extend_high_u = new IsomorphicBuffer([0xfd, 170])
        public static readonly shl = new IsomorphicBuffer([0xfd, 171])
        public static readonly shr_s = new IsomorphicBuffer([0xfd, 172])
        public static readonly shr_u = new IsomorphicBuffer([0xfd, 173])
        public static readonly add = new IsomorphicBuffer([0xfd, 174])
        public static readonly sub = new IsomorphicBuffer([0xfd, 182])
        public static readonly mul = new IsomorphicBuffer([0xfd, 185])
        public static readonly min_s = new IsomorphicBuffer([0xfd, 186])
        public static readonly min_u = new IsomorphicBuffer([0xfd, 188])
        public static readonly max_s = new IsomorphicBuffer([0xfd, 189])
        public static readonly max_u = new IsomorphicBuffer([0xfd, 190])
        public static readonly avgr_u = new IsomorphicBuffer([0xfd, 191])
        public static readonly extmul_low_s = new IsomorphicBuffer([0xfd, 156])
        public static readonly extmul_high_s = new IsomorphicBuffer([0xfd, 158])
        public static readonly extmul_low_u = new IsomorphicBuffer([0xfd, 157])
        public static readonly extmul_high_u = new IsomorphicBuffer([0xfd, 159])

        public static readonly trunc_sat_f32_s = new IsomorphicBuffer([0xfd, 248])
        public static readonly trunc_sat_f32_u = new IsomorphicBuffer([0xfd, 248])
        public static readonly trunc_sat_f64_s_zero = new IsomorphicBuffer([0xfd, 252])
        public static readonly trunc_sat_f64_u_zero = new IsomorphicBuffer([0xfd, 253])
    };

    export class i64
    {
        public static load_splat = [0xfd, 10];
        public static load_zero = [0xfd, 93];
        public static load_lane = [0xfd, 87];
        public static store_lane = [0xfd, 91];
        public static extract_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 29, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 30, l]); }

        public static readonly splat = new IsomorphicBuffer([0xfd, 18])

        public static readonly eq = new IsomorphicBuffer([0xfd, 214])
        public static readonly ne = new IsomorphicBuffer([0xfd, 215])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 216])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 217])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 218])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 219])

        public static readonly abs = new IsomorphicBuffer([0xfd, 192])
        public static readonly neg = new IsomorphicBuffer([0xfd, 193])
        // public static readonly q15mulr_sat_s = [0xfd,  194]
        public static readonly all_true = new IsomorphicBuffer([0xfd, 195])
        public static readonly bitmask = new IsomorphicBuffer([0xfd, 196])
        public static readonly extend_low_s = new IsomorphicBuffer([0xfd, 199])
        public static readonly extend_high_s = new IsomorphicBuffer([0xfd, 200])
        public static readonly extend_low_u = new IsomorphicBuffer([0xfd, 201])
        public static readonly extend_high_u = new IsomorphicBuffer([0xfd, 202])
        public static readonly shl = new IsomorphicBuffer([0xfd, 203])
        public static readonly shr_s = new IsomorphicBuffer([0xfd, 204])
        public static readonly shr_u = new IsomorphicBuffer([0xfd, 205])
        public static readonly add = new IsomorphicBuffer([0xfd, 206])
        public static readonly sub = new IsomorphicBuffer([0xfd, 209])
        public static readonly mul = new IsomorphicBuffer([0xfd, 213])
        public static readonly extmul_low_s = new IsomorphicBuffer([0xfd, 220])
        public static readonly extmul_high_s = new IsomorphicBuffer([0xfd, 221])
        public static readonly extmul_low_u = new IsomorphicBuffer([0xfd, 222])
        public static readonly extmul_high_u = new IsomorphicBuffer([0xfd, 223])
    };

    export class f32
    {
        public static extract_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 31, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 32, l]); }

        public static readonly splat = new IsomorphicBuffer([0xfd, 19])

        public static readonly eq = new IsomorphicBuffer([0xfd, 65])
        public static readonly ne = new IsomorphicBuffer([0xfd, 66])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 67])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 68])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 69])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 70])

        public static readonly ceil = new IsomorphicBuffer([0xfd, 103])
        public static readonly floor = new IsomorphicBuffer([0xfd, 104])
        public static readonly trunc = new IsomorphicBuffer([0xfd, 105])
        public static readonly nearest = new IsomorphicBuffer([0xfd, 106])
        public static readonly abs = new IsomorphicBuffer([0xfd, 224])
        public static readonly neg = new IsomorphicBuffer([0xfd, 225])
        public static readonly sqrt = new IsomorphicBuffer([0xfd, 227])
        public static readonly add = new IsomorphicBuffer([0xfd, 228])
        public static readonly sub = new IsomorphicBuffer([0xfd, 229])
        public static readonly mul = new IsomorphicBuffer([0xfd, 230])
        public static readonly div = new IsomorphicBuffer([0xfd, 231])
        public static readonly min = new IsomorphicBuffer([0xfd, 232])
        public static readonly max = new IsomorphicBuffer([0xfd, 233])
        public static readonly pmin = new IsomorphicBuffer([0xfd, 234])
        public static readonly pmax = new IsomorphicBuffer([0xfd, 235])

        public static readonly convert_i32_s = new IsomorphicBuffer([0xfd, 250])
        public static readonly convert_i32_u = new IsomorphicBuffer([0xfd, 251])
        public static readonly demote_f64_zero = new IsomorphicBuffer([0xfd, 94])
    };

    export class f64
    {
        public static extract_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 33, l]); }
        public static replace_lane(l: indexes.lane) { return new IsomorphicBuffer([0xfd, 34, l]); }

        public static readonly splat = new IsomorphicBuffer([0xfd, 20])

        public static readonly eq = new IsomorphicBuffer([0xfd, 71])
        public static readonly ne = new IsomorphicBuffer([0xfd, 72])
        public static readonly lt_s = new IsomorphicBuffer([0xfd, 73])
        public static readonly gt_s = new IsomorphicBuffer([0xfd, 74])
        public static readonly le_s = new IsomorphicBuffer([0xfd, 75])
        public static readonly ge_s = new IsomorphicBuffer([0xfd, 76])

        public static readonly ceil = new IsomorphicBuffer([0xfd, 116])
        public static readonly floor = new IsomorphicBuffer([0xfd, 117])
        public static readonly trunc = new IsomorphicBuffer([0xfd, 122])
        public static readonly nearest = new IsomorphicBuffer([0xfd, 148])
        public static readonly abs = new IsomorphicBuffer([0xfd, 236])
        public static readonly neg = new IsomorphicBuffer([0xfd, 237])
        public static readonly sqrt = new IsomorphicBuffer([0xfd, 239])
        public static readonly add = new IsomorphicBuffer([0xfd, 240])
        public static readonly sub = new IsomorphicBuffer([0xfd, 241])
        public static readonly mul = new IsomorphicBuffer([0xfd, 242])
        public static readonly div = new IsomorphicBuffer([0xfd, 243])
        public static readonly min = new IsomorphicBuffer([0xfd, 244])
        public static readonly max = new IsomorphicBuffer([0xfd, 245])
        public static readonly pmin = new IsomorphicBuffer([0xfd, 246])
        public static readonly pmax = new IsomorphicBuffer([0xfd, 247])

        public static readonly convert_low_i32_s = new IsomorphicBuffer([0xfd, 254])
        public static readonly convert_low_i32_u = new IsomorphicBuffer([0xfd, 255])
        public static readonly promote_low_f32 = new IsomorphicBuffer([0xfd, 95])
    };
}
