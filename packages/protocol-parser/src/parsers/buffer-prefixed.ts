import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithoutKnownLength, parserWrite } from './_common.js';

export default class PrefixedBuffer implements ParserWithoutKnownLength<IsomorphicBuffer>
{
    constructor(private prefix: AnyParser<number, unknown>, private readonly dismissMainBuffer: boolean = false)
    {

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = this.prefix.read(buffer, cursor, null);
        const offset = cursor.offset;
        const result = buffer.subarray(offset, cursor.offset += length);
        if (this.dismissMainBuffer)
            return new IsomorphicBuffer(result.toArray());

        return result;
    }

    write(value: IsomorphicBuffer): IsomorphicBuffer[]
    {
        var buffers: IsomorphicBuffer[] = [];
        buffers.push(...parserWrite(this.prefix, value.length));
        buffers.push(value);
        return buffers;
    }
}
