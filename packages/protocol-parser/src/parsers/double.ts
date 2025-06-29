import { Cursor, Parser } from './_common.js';
import { double } from "../core.js";
import Uint64 from './uint64.js';
import { IsomorphicBuffer } from '@akala/core';

const length = 8;

export default class Double implements Parser<double>
{
    constructor()
    {

    }
    getLength(value: number): number
    {
        return length;
    }

    readonly length = length;

    public read(buffer: IsomorphicBuffer, cursor: Cursor): double
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(length);
            tmpBuffer.writeBigUInt64BE(Uint64.prototype.read(buffer, cursor));
            return tmpBuffer.readDoubleBE();
        }
        const value = buffer.readDoubleBE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: double)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(length);
            tmpBuffer.writeDoubleBE(value);
            Uint64.prototype.write(buffer, cursor, tmpBuffer.readBigUInt64BE())
        }
        else
        {
            buffer.writeDoubleBE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
