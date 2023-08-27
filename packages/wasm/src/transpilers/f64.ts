export enum f64
{
    type = 0x7c,

    const = 0x44,

    load = 0x2b,

    store = 0x39,

    eq = 0x61,
    ne = 0x62,
    lt = 0x63,
    gt = 0x64,
    le = 0x65,
    ge = 0x66,
    abs = 0x99,
    neg = 0x9a,
    ceil = 0x9b,
    floor = 0x9c,
    trunc = 0x9d,
    nearest = 0x9e,
    sqrt = 0x9f,
    add = 0xa0,
    sub = 0xa1,
    mul = 0xa2,
    div = 0xa3,
    min = 0xa4,
    max = 0xa5,
    copysign = 0xa6,

    convert_i32_s = 0xb7,
    convert_i32_u = 0xb7,
    convert_i64_s = 0xb9,
    convert_i64_u = 0xba,
    promote_f32 = 0xbb,
    reinterpret_i64 = 0xbf,
}

export const type = f64.type
