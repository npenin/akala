import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';
import Uint16 from './uint16.js';
import Uint8 from './uint8.js';

const length = 4;

export default class Uint32LE implements Parser<number>
{
    constructor()
    {

    }

    readonly length = length;

    getLength(value: number): number
    {
        return length;
    }
    public read(buffer: IsomorphicBuffer, cursor: Cursor): number
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(4);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 3);
            return tmpBuffer.readUInt32LE(0);
        }
        const value = buffer.readUInt32LE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: number)
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(4);
            tmpBuffer.writeUInt32LE(value, 0);
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readUInt16LE(0));
            Uint16.prototype.write(buffer, cursor, tmpBuffer.readUInt16LE(2));
        }
        else
        {
            buffer.writeUInt32LE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
