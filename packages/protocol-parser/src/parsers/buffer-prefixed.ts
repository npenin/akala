import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';

export default class PrefixedBuffer implements Parser<IsomorphicBuffer>
{
    constructor(private prefix: Parser<number>, private readonly dismissMainBuffer: boolean = false)
    {

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = this.prefix.read(buffer, cursor);
        const offset = cursor.offset;
        const result = buffer.subarray(offset, cursor.offset += length);
        if (this.dismissMainBuffer)
            return new IsomorphicBuffer(result.toArray());

        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: IsomorphicBuffer)
    {
        this.prefix.write(buffer, cursor, value.length);
        buffer.copy(value, cursor.offset);
    }
}
