import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';

export default class FixedBuffer implements Parser<IsomorphicBuffer>
{
    constructor(public readonly length: number)
    {

    }

    read(buffer: IsomorphicBuffer, cursor: Cursor): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length == -1)
        {
            cursor.offset += buffer.length;
            return buffer;
        }

        return buffer.subarray(cursor.offset, cursor.offset += this.length);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: IsomorphicBuffer)
    {
        value.copy(buffer, cursor.offset, 0, this.length);
    }
}
