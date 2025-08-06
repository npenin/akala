import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';

export default class FixedBuffer implements Parser<IsomorphicBuffer>
{
    constructor(public readonly length: number, private readonly dismissMainBuffer: boolean = false)
    {

    }
    getLength(value: IsomorphicBuffer): number
    {
        return this.length;
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const offset = cursor.offset;
        if (this.length == -1)
        {
            cursor.offset = buffer.length;
            return buffer.subarray(offset);
        }

        const result = buffer.subarray(offset, cursor.offset += this.length);

        if (this.dismissMainBuffer)
            return new IsomorphicBuffer(result.toArray());

        return result;

    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: IsomorphicBuffer)
    {
        if (this.length)
            buffer.copy(value, cursor.offset, 0, this.length);
    }
}
