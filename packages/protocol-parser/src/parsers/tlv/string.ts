import PrefixedString from "../string-prefixed.js";
import { Cursor, Parsers } from "../_common.js";
import { IsomorphicBuffer } from "@akala/core";

export class TLVString extends PrefixedString
{
    constructor(parser: Parsers<number>, private readonly maxLength: number, encoding?: BufferEncoding)
    {
        super(parser, encoding)
    }

    write(value: string): IsomorphicBuffer[]
    {
        var result = []
        const cursor = new Cursor();
        while (cursor.offset < value.length)
        {
            if (value.length > this.maxLength)
            {
                result.push(...super.write(value.substring(cursor.offset, this.maxLength)));
                cursor.offset += this.maxLength;
            }
            else
            {
                result.push(...super.write(value.substring(cursor.offset)));
                cursor.offset += this.maxLength;
            }
        }
        return result;
    }

}
