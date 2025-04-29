import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor, ParserWithMessageWithoutKnownLength } from './_common.js';

export default class PreparsedString<T, TKey extends keyof T, TString extends string = string> implements ParserWithMessageWithoutKnownLength<TString, T>
{
    constructor(private readonly lengthProperty: TKey, private readonly encoding: BufferEncoding = 'ascii')
    {

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const value = buffer.toString(this.encoding, cursor.offset, cursor.offset + Number(message[this.lengthProperty]));
        cursor.offset += value.length;
        return value as TString;
    }
    write(value: TString, message: T): IsomorphicBuffer[]
    {
        const buffers: IsomorphicBuffer[] = [];
        buffers.push(IsomorphicBuffer.from(value, this.encoding).subarray(0, Number(message[this.lengthProperty])));
        return buffers
    }

}
