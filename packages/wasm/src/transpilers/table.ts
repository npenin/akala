import { memory } from './memory.js';
import { valtype } from './types.js';
import { indexes, wasmtype } from './wasmtype.js'

export const table =
{
    get: 0x25,
    set: 0x26,
    init: [0xfc, 12],
    elem_drop: [0xfc, 13],
    copy: [0xfc, 14],
    grow: [0xfc, 15],
    size: [0xfc, 16],
    fill: [0xfc, 17],
}