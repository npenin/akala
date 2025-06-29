import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor, ParserWithMessage } from './_common.js';

export default class PreparsedString<T, TKey extends keyof T, TString extends string = string> implements ParserWithMessage<TString, T>
{
    constructor(private readonly lengthProperty: TKey, private readonly encoding: BufferEncoding = 'ascii')
    {

    }
    getLength(value: TString, message?: T): number
    {
        return Number(message[this.lengthProperty]);
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
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TString, message: T): void
    {
        buffer.copy(IsomorphicBuffer.from(value, this.encoding).subarray(0, Number(message[this.lengthProperty])), cursor.offset);
    }

}
