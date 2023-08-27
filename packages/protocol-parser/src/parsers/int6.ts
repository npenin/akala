import Bit from './bit.js';
import { Cursor, Parser } from './_common.js';
import Uint2 from './uint2.js';
import Uint3 from './uint3.js';
import Uint4 from './uint4.js';
import Uint5 from './uint5.js';

const length = .750;

export default class Int6 implements Parser<number>
{
    constructor()
    {

    }

    readonly length = length;

    public read(buffer: Buffer, cursor: Cursor): number
    {
        var currentValue = buffer.readInt8(cursor.floorOffset);
        var value: number;


        switch (cursor.subByteOffset)
        {
            case 0:
                value = (currentValue & 0b00111111);
                break;
            case 1:
                value = (currentValue & 0b01111110) >> cursor.subByteOffset;
                break;
            case 2:
                value = (currentValue & 0b11111100) >> cursor.subByteOffset;
                break;
            case 3:
                value = (currentValue & 0b11111000) >> cursor.subByteOffset;
                currentValue = buffer.readInt8(cursor.floorOffset + 1);
                value = value | ((currentValue & 0b00000001) << (8 - cursor.subByteOffset));
                break;
            case 4:
                value = (currentValue & 0b11110000) >> cursor.subByteOffset;
                currentValue = buffer.readInt8(cursor.floorOffset + 1);
                value = value | ((currentValue & 0b00000011) << (8 - cursor.subByteOffset));
                break;
            case 5:
                value = (currentValue & 0b11100000) >> cursor.subByteOffset;
                currentValue = buffer.readInt8(cursor.floorOffset + 1);
                value = value | ((currentValue & 0b00000111) << (8 - cursor.subByteOffset));
                break;
            case 6:
                value = (currentValue & 0b11000000) >> cursor.subByteOffset;
                currentValue = buffer.readInt8(cursor.floorOffset + 1);
                value = value | ((currentValue & 0b00001111) << (8 - cursor.subByteOffset));
                break;
            case 7:
                value = (currentValue & 0b10000000) >> cursor.subByteOffset;
                currentValue = buffer.readInt8(cursor.floorOffset + 1);
                value = value | ((currentValue & 0b00011111) << (8 - cursor.subByteOffset));
                break;
            default:
                throw new Error('invalid offset');
        }
        cursor.offset += length;
        return value;
    }

    public write(buffer: Buffer, cursor: Cursor, value: number)
    {
        switch (cursor.subByteOffset)
        {
            case 0:
            case 1:
            case 2:
                var currentValue = buffer.readInt8(cursor.floorOffset);
                value = (value & 0b111111) << cursor.subByteOffset;
                buffer.writeUInt8(currentValue | value, cursor.floorOffset);
                cursor.offset += length;
                break;
            case 3:
                Uint5.prototype.write(buffer, cursor, value);
                Bit.prototype.write(buffer, cursor, (value >> 5));
                break;
            case 4:
                Uint4.prototype.write(buffer, cursor, value);
                Uint2.prototype.write(buffer, cursor, (value >> 4));
                break;
            case 5:
                Uint3.prototype.write(buffer, cursor, value);
                Uint3.prototype.write(buffer, cursor, value >> 3);
                break;
            case 6:
                Uint2.prototype.write(buffer, cursor, value);
                Uint4.prototype.write(buffer, cursor, value >> 2);
                break;
            case 7:
                Bit.prototype.write(buffer, cursor, (value & 1));
                Uint5.prototype.write(buffer, cursor, value >> 1);
                break;
        }
    }
}