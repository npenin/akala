import { Cursor, Parser } from './_common.js';
import Uint8 from './uint8.js';
import { uint16 } from "../core.js";
import { IsomorphicBuffer } from '@akala/core';

const length = 2;

export default class Uint16 implements Parser<uint16>
{
    constructor()
    {

    }

    readonly length = length;

    getLength(value: number): number
    {
        return length;
    }
    public read(buffer: IsomorphicBuffer, cursor: Cursor): uint16
    {
        if (cursor.subByteOffset > 0)
        {
            let tmpBuffer = new IsomorphicBuffer(2);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
            tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
            return tmpBuffer.readUInt16BE(0);
        }
        const value = buffer.readUInt16BE(cursor.offset);
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: uint16)
    {
        if (cursor.subByteOffset > 0)
        {
            Uint8.prototype.write(buffer, cursor, value >> 8);
            Uint8.prototype.write(buffer, cursor, value & 0xFF);
        }
        else
        {
            buffer.writeUInt16BE(value, cursor.offset);
            cursor.offset += length;
        }
    }
}
