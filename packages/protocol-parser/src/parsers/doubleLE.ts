import { Cursor, type Parser } from './_common.js';
import { type double } from "../core.js";
import Uint64 from './uint64.js';
import { IsomorphicBuffer } from '@akala/core';

const length = 8;

export default class DoubleLE implements Parser<double>
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
            return tmpBuffer.readDoubleLE();
        }
        const value = buffer.readDoubleLE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: double)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(length);
            tmpBuffer.writeDoubleLE(0, value);
            Uint64.prototype.write(buffer, cursor, tmpBuffer.readBigUInt64BE())
        }
        else
        {
            buffer.writeDoubleLE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
