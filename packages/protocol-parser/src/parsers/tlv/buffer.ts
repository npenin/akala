import PrefixedBuffer from "../buffer-prefixed.js";
import { Cursor, type Parsers } from "../_common.js";
import { IsomorphicBuffer } from "@akala/core";

export class TLVBuffer extends PrefixedBuffer
{
    constructor(length: Parsers<number>, private readonly maxLength: number)
    {
        super(length)
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: IsomorphicBuffer)
    {
        if (value.length > this.maxLength)
        {
            super.write(buffer, cursor, value.subarray(cursor.offset, this.maxLength));
            cursor.offset += this.maxLength;
        }
        else
        {
            super.write(buffer, cursor, value.subarray(cursor.offset));
            cursor.offset += value.length;
        }
    }
}
