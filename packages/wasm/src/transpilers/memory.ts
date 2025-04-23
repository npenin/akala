import { IsomorphicBuffer } from '@akala/core';
import { indexes } from './wasmtype.js'

export class memory
{
    public static readonly size = new IsomorphicBuffer([0x3f, 0x00]);
    public static readonly grow = new IsomorphicBuffer([0x40, 0x00]);
    public static init(x: indexes.data) { return new IsomorphicBuffer([0xfc, 8, x, 0x00]) }
    public static data_drop(x: indexes.data) { return new IsomorphicBuffer([0xfc, 9, x, 0x00]) }
    public static readonly copy = new IsomorphicBuffer([0xfc, 10, 0x00, 0x00]);
    public static readonly fill = new IsomorphicBuffer([0xfc, 11, 0x00]);
}
