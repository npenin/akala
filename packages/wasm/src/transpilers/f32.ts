export enum f32
{
    type = 0x7d,

    const = 0x43,

    load = 0x2a,
    store = 0x38,


    eq = 0x5b,
    ne = 0x5c,
    lt = 0x5d,
    gt = 0x5e,
    le = 0x5f,
    ge = 0x60,
    abs = 0x8b,
    neg = 0x8c,
    ceil = 0x8d,
    floor = 0x8e,
    trunc = 0x8f,
    nearest = 0x90,
    sqrt = 0x91,
    add = 0x92,
    sub = 0x93,
    mul = 0x94,
    div = 0x95,
    min = 0x96,
    max = 0x97,
    copysign = 0x98,

    convert_i32_s = 0xb2,
    convert_i32_u = 0xb3,
    convert_i64_s = 0xb4,
    convert_i64_u = 0xb5,
    demote_f64 = 0xb6,
    reinterpret_i32 = 0xbe,
}

export const type = f32.type
