import { IsomorphicBuffer } from '@akala/core';
import { ParserWithMessageWithoutKnownLength, Cursor, parserWrite, AnyParser } from './_common.js';


export class Sub<TResult, TMessage> implements ParserWithMessageWithoutKnownLength<TResult, TMessage>
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

    write(value: TResult, message: TMessage): IsomorphicBuffer[];
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TResult, message: TMessage): void;
    write(buffer: IsomorphicBuffer | TResult, cursor?: Cursor | TMessage, value?: TResult, message?: TMessage)
    {
        if (!(cursor instanceof Cursor))
        {
            var buffers = parserWrite(this.inner, buffer as TResult, cursor);
            if (buffers)
            {
                buffers.unshift(...parserWrite(this.lengthParser, buffers.reduce((previous, current) => previous + current.length, 0), cursor));
            }
            return buffers;
        }
        var buffers = parserWrite(this.inner, value, message);
        if (buffers)
        {
            buffers.unshift(...parserWrite(this.lengthParser, buffers.reduce((previous, current) => previous + current.length, 0), message));
        }
        return buffers;
    }
}
