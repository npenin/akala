import { Cursor, Parser } from './_common.js';

export default class FixedString<TString extends string = string> implements Parser<TString>
{
    constructor(public readonly length: number, private encoding: BufferEncoding = 'ascii')
    {
    }
    read(buffer: Buffer, cursor: Cursor): TString
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (this.length === -1)
        {
            cursor.offset += buffer.length;
            return buffer.toString(this.encoding, cursor.offset) as TString;
        }

        return buffer.toString(this.encoding, cursor.offset, cursor.offset += this.length) as TString;
    }
    write(value: TString): void
    write(buffer: Buffer, cursor: Cursor, value?: TString): Buffer[]
    write(buffer: Buffer | TString, cursor?: Cursor, value?: TString): Buffer[] | void
    {
        if (value.length != this.length)
            throw new Error(`string length (${value.length}) is not matching with expected length (${this.length})`)

        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (typeof (buffer) === 'string')
            return [Buffer.from(value, this.encoding)];
        else
            cursor.offset += buffer.write(value, cursor.offset, this.length, this.encoding);
    }
}