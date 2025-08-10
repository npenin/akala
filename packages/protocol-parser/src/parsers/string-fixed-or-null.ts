import { IsomorphicBuffer, type BufferEncoding } from '@akala/core';
import { Cursor, type Parser } from './_common.js';

export default class FixedStringOrNull<TString extends string = string> implements Parser<TString>
{

    constructor(public readonly length: number, protected readonly encoding: BufferEncoding = 'ascii')
    {
    }
    getLength(value: TString): number
    {
        return IsomorphicBuffer.getInitLength(value, this.encoding);
    }
    read(buffer: IsomorphicBuffer, cursor: Cursor): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length === -1)
        {
            for (let i = 0; i < buffer.length; i++)
                if (buffer.readUInt8(i) === 0)
                    return buffer.toString(this.encoding, cursor.offset, cursor.offset += i) as TString;

            cursor.offset += buffer.length;
            return buffer.toString(this.encoding, cursor.offset) as TString;
        }

        return buffer.toString(this.encoding, cursor.offset, cursor.offset += this.length) as TString;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: TString): void
    {
        if (value.length != this.length)
            throw new Error(`string length (${value.length}) is not matching with expected length (${this.length})`)

        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        cursor.offset += buffer.write(value, cursor.offset, this.length, this.encoding);
    }
}
