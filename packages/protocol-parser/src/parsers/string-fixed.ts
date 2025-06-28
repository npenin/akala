import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor, Parser } from './_common.js';

export default class FixedString<TString extends string = string> implements Parser<TString>
{
    constructor(public readonly length: number, protected readonly encoding: BufferEncoding = 'ascii')
    {
    }
    read(buffer: IsomorphicBuffer, cursor: Cursor): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length === -1)
        {
            const offset = cursor.offset;
            cursor.offset += buffer.length;
            return buffer.toString(this.encoding, offset) as TString;
        }

        return buffer.toString(this.encoding, cursor.offset, cursor.offset += this.length) as TString;
    }
    write(value: TString): void
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: TString): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer | TString, cursor?: Cursor, value?: TString): IsomorphicBuffer[] | void
    {
        if (!(buffer instanceof IsomorphicBuffer))
        {
            value = buffer;
            buffer = null;
        }
        else if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length == -1)
            return [IsomorphicBuffer.from(value, this.encoding)];

        if (value.length != this.length)
            throw new Error(`string length (${value.length}) is not matching with expected length (${this.length})`)

        if (typeof (buffer) === 'string')
            return [IsomorphicBuffer.from(value, this.encoding)];
        else
            cursor.offset += buffer.write(value, cursor.offset, this.length, this.encoding);
    }
}
