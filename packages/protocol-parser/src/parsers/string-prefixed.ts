import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor, Parsers, Parser } from './_common.js';

export default class PrefixedString<TString extends string = string> implements Parser<TString>
{
    constructor(private prefix: Parsers<number>, private encoding: BufferEncoding = 'ascii')
    {

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor);

        var value = buffer.toString(this.encoding, cursor.offset, cursor.offset + length);
        cursor.offset += length;
        return value as TString;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TString): void
    {
        this.prefix.write(buffer, cursor, value.length);
        buffer.copy(IsomorphicBuffer.from(value, this.encoding), cursor.offset);
    }

}
