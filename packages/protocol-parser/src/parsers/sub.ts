import { IsomorphicBuffer } from '@akala/core';
import { ParserWithMessage, Cursor, AnyParser } from './_common.js';


export class Sub<TResult, TMessage> implements ParserWithMessage<TResult, TMessage>
{
    constructor(private lengthParser: AnyParser<number, TMessage>, private inner: AnyParser<TResult, TMessage>)
    {
        if (inner.length == -1 || lengthParser.length == -1)
            this.length = -1;

        else
            this.length = inner.length + lengthParser.length as -1;
    }

    length: -1 = -1;

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): TResult
    {
        const initialOffset = cursor.offset;
        var length = this.lengthParser.read(buffer, cursor, message);
        if (buffer.length < cursor.offset + length)
        {
            cursor.offset = initialOffset;
            return null;
        }
        var result = this.inner.read(buffer.subarray(cursor.offset, cursor.offset + length), new Cursor(), message);
        cursor.offset += length;
        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TResult, message: TMessage): void
    {
        if (this.lengthParser.length == -1)
            throw new Error('cannot write a prefixed series without knowing how much needs to be written');
        const initalOffset = cursor.offset;
        cursor.offset += this.lengthParser.length;
        this.inner.write(buffer, cursor, value, message);
        const finalOffset = cursor.offset;
        cursor.offset = initalOffset;
        this.lengthParser.write(buffer, cursor, finalOffset - initalOffset, message);
        cursor.offset = finalOffset;

    }
}
