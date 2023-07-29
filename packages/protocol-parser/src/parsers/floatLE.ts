import { Cursor, Parser } from './_common.js';
import { float } from "../core.js";
import Uint32 from './uint32.js';

const length = 4;

export default class FloatLE implements Parser<float>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: Buffer, cursor: Cursor): float
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(length);
            tmpBuffer.writeUint32BE(Uint32.prototype.read(buffer, cursor));
            return tmpBuffer.readFloatLE(0);
        }
        const value = buffer.readFloatLE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: Buffer, cursor: Cursor, value: float)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(length);
            tmpBuffer.writeFloatLE(value);
            Uint32.prototype.write(buffer, cursor, tmpBuffer.readUInt32BE())
        }
        else
        {
            buffer.writeFloatLE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}