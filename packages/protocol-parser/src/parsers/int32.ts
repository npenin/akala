import { Cursor, Parser } from './_common.js';
import Uint16 from './uint16.js';
import Uint8 from './uint8.js';
import { int32 } from "../core.js";

const length = 4;

export default class Int32 implements Parser<int32>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: Buffer, cursor: Cursor): int32
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(4);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 3);
            return tmpBuffer.readInt32BE(0);
        }
        const value = buffer.readInt32BE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: Buffer, cursor: Cursor, value: int32)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(4);
            tmpBuffer.writeInt32BE(value, 0);
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readUInt16BE(0));
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readUInt16BE(2));
        }
        else
        {
            buffer.writeInt32BE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}