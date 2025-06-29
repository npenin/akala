import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor, Parsers } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class PrefixedLengthSeries<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private prefix: Parsers<number>, private valueParser: AnyParser<T, TMessage>)
    {
    }

    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor);
        return this.valueParser.read(buffer.subarray(0, length), cursor, message);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        if (this.prefix.length == -1)
            throw new Error('cannot write a prefixed series without knowing how much needs to be written');
        const initalOffset = cursor.offset;
        cursor.offset += this.prefix.length;
        this.valueParser.write(buffer, cursor, value, message);
        const finalOffset = cursor.offset;
        cursor.offset = initalOffset;
        this.prefix.write(buffer, cursor, finalOffset - initalOffset);
        cursor.offset = finalOffset;
    }
}
