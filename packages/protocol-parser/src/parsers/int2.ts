import Bit from './bit.js';
import { Cursor, Parser } from './_common.js';
import { IsomorphicBuffer } from '@akala/core'

const length = .25;

export default class Int2 implements Parser<number>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: IsomorphicBuffer, cursor: Cursor): number
    {
        var currentValue = buffer.readInt8(cursor.floorOffset);
        var floorOffset = cursor.floorOffset;
        var subByteOffset = cursor.subByteOffset;
        switch (subByteOffset)
        {
            case 0:
                value = currentValue & 0b00000011;
                break;
            case 1:
                value = (currentValue & 0b00000110) >> subByteOffset;
                break;
            case 2:
                value = (currentValue & 0b00001100) >> subByteOffset;
                break;
            case 3:
                value = (currentValue & 0b00011000) >> subByteOffset;
                break;
            case 4:
                value = (currentValue & 0b00110000) >> subByteOffset;
                break;
            case 5:
                value = (currentValue & 0b01100000) >> subByteOffset;
                break;
            case 6:
                value = (currentValue & 0b11000000) >> subByteOffset;
                break;
            case 7:
                var value = (currentValue & 0b10000000) >> subByteOffset;
                currentValue = buffer.readInt8(floorOffset + 1);
                value = value | ((currentValue & 0b00000001) << (8 - subByteOffset));
                break;
            default:
                throw new Error('invalid offset');
        }
        cursor.offset += length;
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: number)
    {
        if (cursor.subByteOffset > 6)
        {
            Bit.prototype.write(buffer, cursor, ((value >> 1) & 1));
            Bit.prototype.write(buffer, cursor, (value & 1));
            return;
        }
        var currentValue = buffer.readInt8(cursor.floorOffset);
        value = (value & 0b11) << cursor.subByteOffset;
        buffer.writeInt8(currentValue | value, cursor.floorOffset);
        cursor.offset += this.length || .25;
    }
}
