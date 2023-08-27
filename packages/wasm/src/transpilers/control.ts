import { uint8 } from '@akala/protocol-parser';
import { indexes, wasmtype } from './wasmtype.js'

export enum control 
{
    block = 0x02,
    loop = 0x03,
    if = 0x04,
    else = 0x05,

    br = 0x0c,
    br_if = 0x0d,
    br_table = 0x0e,
    call = 0x10,
    call_indirect = 0x11,
    drop = 0x1a,

    empty_block = 0x40,
    unreachable = 0x00,
    nop = 0x01,
    end = 0x0b,
    return = 0x0f,

}