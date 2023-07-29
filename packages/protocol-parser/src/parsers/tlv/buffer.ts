import PrefixedBuffer from "../buffer-prefixed.js";
import { Cursor, Parsers } from "../_common.js";

export class TLVBuffer extends PrefixedBuffer
{
    constructor(length: Parsers<number>, private readonly maxLength: number)
    {
        super(length)
    }

    write(value: Buffer): Buffer[]
    {
        var result = []
        const cursor = new Cursor();
        while (cursor.offset < value.length)
        {
            if (value.length > this.maxLength)
            {
                result.push(...super.write(value.subarray(cursor.offset, this.maxLength)));
                cursor.offset += this.maxLength;
            }
            else
            {
                result.push(...super.write(value.subarray(cursor.offset)));
                cursor.offset += this.maxLength;
            }
        }
        return result;
    }

}