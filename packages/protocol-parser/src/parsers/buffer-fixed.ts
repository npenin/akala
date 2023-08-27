import { Cursor, Parser } from './_common.js';

export default class FixedBuffer implements Parser<Buffer>
{
    constructor(public readonly length: number)
    {

    }

    read(buffer: Buffer, cursor: Cursor): Buffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length == -1)
        {
            const result = buffer.slice(cursor.offset, cursor.limit);
            cursor.offset = cursor.limit;
            return result;
        }

        return buffer.slice(cursor.offset, cursor.offset += this.length);
    }

    write(buffer: Buffer, cursor: Cursor, value: Buffer)
    {
        if (this.length === -1)
            return [buffer];
        else
            value.copy(buffer, cursor.offset, 0, this.length);
    }
}