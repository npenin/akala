import { ErrorWithStatus, IsomorphicBuffer } from '@akala/core';
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
    getLength(value: TResult, message?: TMessage): number
    {
        if (this.length > -1)
            return this.length;
        const length = this.inner.getLength(value, message);
        return length + this.lengthParser.getLength(length, message);
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
        if (this.inner.length == -1)
        {
            const length = this.inner.getLength(value, message);
            if (length == -1)
                throw new ErrorWithStatus(400, 'cannot write a sub without knowing how much needs to be written');

            this.lengthParser.write(buffer, cursor, length, message);
            this.inner.write(buffer, cursor, value, message);
        }
        else
        {
            this.lengthParser.write(buffer, cursor, this.inner.length, message);
            this.inner.write(buffer, cursor, value, message);
        }
    }
}
