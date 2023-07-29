import { Cursor, Parser } from './_common.js';
import Uint8 from './uint8.js';

const length = 2;

export default class Uint16LE implements Parser<number>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: Buffer, cursor: Cursor): number
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            return tmpBuffer.readUInt16LE(0);
        }
        const value = buffer.readUInt16LE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: Buffer, cursor: Cursor, value: number)
    {
        if (cursor.subByteOffset > 0)
        {
            Uint8.prototype.write(buffer, cursor, value & 0xFF);
            Uint8.prototype.write(buffer, cursor, value >> 8);
        }
        else
        {
            buffer.writeUInt16LE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}