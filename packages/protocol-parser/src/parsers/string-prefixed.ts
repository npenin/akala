import { Cursor, Parsers, ParserWithoutKnownLength, parserWrite } from './_common.js';

export default class PrefixedString<TString extends string = string> implements ParserWithoutKnownLength<TString>
{
    constructor(private prefix: Parsers<number>, private encoding: BufferEncoding = 'ascii')
    {

    }
    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor);

        var value = buffer.toString(this.encoding, cursor.offset, cursor.offset + length);
        cursor.offset += length;
        return value as TString;
    }
    write(value: TString): Buffer[]
    {
        var buffers: Buffer[] = [];
        buffers.push(...parserWrite(this.prefix, value.length));
        buffers.push(Buffer.from(value, this.encoding));
        return buffers
    }

}