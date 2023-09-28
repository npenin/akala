import { i32, i64, mergeUInt8Arrays } from '../helpers/types.js';
import { indexes, u32, u8 } from './wasmtype.js'

export class memory
{
    public static readonly size = new Uint8Array([0x3f, 0x00]);
    public static readonly grow = new Uint8Array([0x40, 0x00]);
    public static init(x: indexes.data) { return new Uint8Array([0xfc, 8, x, 0x00]) }
    public static data_drop(x: indexes.data) { return new Uint8Array([0xfc, 9, x, 0x00]) }
    public static readonly copy = new Uint8Array([0xfc, 10, 0x00, 0x00]);
    public static readonly fill = new Uint8Array([0xfc, 11, 0x00]);
}