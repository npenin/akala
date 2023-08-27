import { i32, i64, mergeUInt8Arrays } from '../helpers/types.js';
import { indexes, u32, u8 } from './wasmtype.js'

export class memory<TArch extends number | bigint>
{
    private constructor(public offset?: TArch, public align?: u8)
    {
    }

    public static memarg<TNative extends u32 | bigint>(offset?: TNative, align?: u8)
    {
        return new memory(offset, align);
    }

    toOpCodes(defaultAlign: u8): Uint8Array
    {
        if (typeof this.offset == 'undefined')
            return new Uint8Array([this.align || defaultAlign, 0])
        else if (typeof this.offset === 'bigint')
            return mergeUInt8Arrays([this.align || defaultAlign], i64.const(this.offset).toOpCodes())
        else
            return mergeUInt8Arrays([this.align || defaultAlign], i32.const(this.offset).toOpCodes())
    }

    public static readonly size = new Uint8Array([0x3f, 0x00]);
    public static readonly grow = new Uint8Array([0x40, 0x00]);
    public static init(x: indexes.data) { return new Uint8Array([0xfc, 8, x, 0x00]) }
    public static data_drop(x: indexes.data) { return new Uint8Array([0xfc, 9, x, 0x00]) }
    public static readonly copy = new Uint8Array([0xfc, 10, 0x00, 0x00]);
    public static readonly fill = new Uint8Array([0xfc, 11, 0x00]);
}