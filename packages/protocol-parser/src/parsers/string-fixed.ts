import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor, Parser } from './_common.js';

export default class FixedString<TString extends string = string> implements Parser<TString>
{
    constructor(public readonly length: number, protected readonly encoding: BufferEncoding = 'ascii')
    {
    }
    getLength(value: TString): number
    {
        if (this.length == -1)
            return IsomorphicBuffer.getInitLength(value, this.encoding);
        return this.length;
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
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: TString): void
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length !== -1 && value.length != this.length)
            throw new Error(`string length (${value.length}) is not matching with expected length (${this.length})`)

        const bytes = IsomorphicBuffer.from(value, this.encoding);
        buffer.copy(bytes, cursor.offset, 0);

        cursor.offset += bytes.length;
    }
}
