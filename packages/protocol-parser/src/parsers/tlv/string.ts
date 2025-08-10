import PrefixedString from "../string-prefixed.js";
import { Cursor, type Parsers } from "../_common.js";
import { IsomorphicBuffer, type BufferEncoding } from "@akala/core";

export class TLVString extends PrefixedString
{
    constructor(parser: Parsers<number>, private readonly maxLength: number, encoding?: BufferEncoding)
    {
        super(parser, encoding)
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: string): void
    {
        if (value.length > this.maxLength)
        {
            super.write(buffer, cursor, value.substring(cursor.offset, this.maxLength));
            cursor.offset += this.maxLength;
        }
        else
        {
            super.write(buffer, cursor, value.substring(cursor.offset));
            cursor.offset += this.maxLength;
        }
    }

}
