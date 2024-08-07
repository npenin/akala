import { AnyParser, Cursor, ParserWithoutKnownLength, parserWrite } from './_common.js';

export default class PrefixedBuffer implements ParserWithoutKnownLength<Buffer>
{
    constructor(private prefix: AnyParser<number, unknown>)
    {

    }
    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor): Buffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor, null);
        const result = buffer.subarray(cursor.offset, cursor.offset + length);
        cursor.offset += length;
        return result;
    }

    write(value: Buffer): Buffer[]
    {
        var buffers: Buffer[] = [];
        buffers.push(...parserWrite(this.prefix, value.length));
        buffers.push(value);
        return buffers;
    }
}