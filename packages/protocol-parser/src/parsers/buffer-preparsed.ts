import { IsomorphicBuffer } from '@akala/core';
import { Cursor, ParserWithMessageWithoutKnownLength } from './_common.js';

export default class PreparsedLengthBuffer<T, TKey extends keyof T> implements ParserWithMessageWithoutKnownLength<IsomorphicBuffer, T>
{
    constructor(private readonly lengthProperty: TKey, private readonly dismissMainBuffer: boolean = false)//, private encoding: BufferEncoding = 'ascii')
    {

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = Number(message[this.lengthProperty]);
        const offset = cursor.offset;
        const result = buffer.subarray(offset, cursor.offset += length);
        if (this.dismissMainBuffer)
            return new IsomorphicBuffer(result.toArray());
        return result;
    }
    write(value: IsomorphicBuffer): IsomorphicBuffer[]
    {
        return [value];
    }

}
