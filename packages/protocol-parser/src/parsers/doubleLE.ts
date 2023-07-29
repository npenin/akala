import { Cursor, Parser } from './_common.js';
import Uint8 from './uint8.js';
import { double } from "../core.js";
import Uint64 from './uint64.js';

const length = 8;

export default class DoubleLE implements Parser<double>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: Buffer, cursor: Cursor): double
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(length);
            tmpBuffer.writeBigUint64BE(Uint64.prototype.read(buffer, cursor));
            return tmpBuffer.readDoubleLE(0);
        }
        const value = buffer.readDoubleLE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: Buffer, cursor: Cursor, value: double)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = Buffer.alloc(length);
            tmpBuffer.writeDoubleLE(value);
            Uint64.prototype.write(buffer, cursor, tmpBuffer.readBigUint64BE())
        }
        else
        {
            buffer.writeDoubleLE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}