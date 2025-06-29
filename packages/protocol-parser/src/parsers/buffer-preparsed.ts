import { IsomorphicBuffer } from '@akala/core';
import { Cursor, ParserWithMessage } from './_common.js';

export default class PreparsedLengthBuffer<T, TKey extends keyof T> implements ParserWithMessage<IsomorphicBuffer, T>
{
    constructor(protected readonly lengthProperty: TKey, protected readonly dismissMainBuffer: boolean = false)//, private encoding: BufferEncoding = 'ascii')
    {

    }
    getLength(value: IsomorphicBuffer, message?: T): number
    {
        return value.length;
    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        let length = Number(message[this.lengthProperty]);
        const offset = cursor.offset;
        if (length > buffer.length - cursor.offset)
            length = buffer.length - cursor.offset;
        const result = buffer.subarray(offset, cursor.offset += length);
        if (this.dismissMainBuffer)
            return new IsomorphicBuffer(result.toArray());
        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: IsomorphicBuffer)
    {
        buffer.copy(value, cursor.offset, 0, value.length);
    }

}
