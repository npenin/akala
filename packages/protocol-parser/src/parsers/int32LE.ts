import { Cursor, type Parser } from './_common.js';
import Uint16 from './uint16.js';
import Uint8 from './uint8.js';
import { type int32 } from "../core.js";
import { IsomorphicBuffer } from '@akala/core';

const length = 4;

export default class Int32LE implements Parser<int32>
{
    constructor()
    {

    }

    readonly length = length;

    getLength(value: number): number
    {
        return length;
    }

    public read(buffer: IsomorphicBuffer, cursor: Cursor): int32
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(4);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 3);
            return tmpBuffer.readInt32LE(0);
        }
        const value = buffer.readInt32LE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: int32)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(4);
            tmpBuffer.writeInt32LE(value, 0);
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readInt16LE(0));
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readInt16LE(2));
        }
        else
        {
            buffer.writeInt32LE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
