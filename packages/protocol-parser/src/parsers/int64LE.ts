import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';
import Uint32 from './uint32.js';
import Uint8 from './uint8.js';

const length = 8;

export default class Int64 implements Parser<bigint>
{
    constructor()
    {

    }

    readonly length = length;

    getLength(value: bigint): number
    {
        return length;
    }

    public read(buffer: IsomorphicBuffer, cursor: Cursor): bigint
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(8);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 3);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 4);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 5);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 6);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 7);
            return tmpBuffer.readBigInt64LE(0);
        }
        const value = buffer.readBigInt64LE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: bigint)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(8);
            tmpBuffer.writeBigInt64LE(value, 0);
            Uint32.prototype.write(buffer, cursor, tmpBuffer.readUInt32LE(2));
            Uint32.prototype.write(buffer, cursor, tmpBuffer.readUInt32LE(0));
        }
        else
        {
            buffer.writeBigInt64LE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
