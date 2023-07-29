import { Cursor, ParserWithMessageWithoutKnownLength } from './_common.js';

export default class PreparsedString<T, TKey extends keyof T, TString extends string = string> implements ParserWithMessageWithoutKnownLength<TString, T>
{
    constructor(private lengthProperty: TKey, private encoding: BufferEncoding = 'ascii')
    {

    }
    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor, message: T): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var value = buffer.toString(this.encoding, cursor.offset, cursor.offset + Number(message[this.lengthProperty]));
        cursor.offset += value.length;
        return value as TString;
    }
    write(value: TString, message: T): Buffer[]
    {
        var buffers: Buffer[] = [];
        buffers.push(Buffer.from(value, this.encoding).slice(0, Number(message[this.lengthProperty])));
        return buffers
    }

}