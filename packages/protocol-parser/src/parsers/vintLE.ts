import { Cursor, ParserWithoutKnownLength } from './_common.js';
import Int16LE from './int16LE.js';
import Int24LE from './int24LE.js';
import Int32LE from './int32LE.js';
import Int8 from './int8.js';
import Uint8 from './uint8.js';

export default class Vuint implements ParserWithoutKnownLength<number>
{
    constructor()
    {

    }

    length: -1 = -1;

    public read(buffer: Buffer, cursor: Cursor): number
    {
        let tmpBuffer = Buffer.alloc(4);
        let value: number;
        let tmpOffset = 0;
        while (tmpOffset < 4 && (value = Uint8.prototype.read(buffer, cursor)) > 0x7f)
            tmpBuffer.writeUInt8(value, tmpOffset++);
        switch (tmpOffset)
        {
            case 1:
                return tmpBuffer.readInt8(0);
            case 2:
                return tmpBuffer.readInt16LE(0);
            case 3:
                return tmpBuffer.readInt8(2) << 16 + tmpBuffer.readInt16LE(0);
            case 4:
                return tmpBuffer.readInt32LE(0);
        }
    }

    public write(value: number)
    {
        if (value <= 0x3f && value >= -0x3f)
        {
            const buffer = Buffer.alloc(1);
            Int8.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0x7f7f && value >= -0x7f7f)
        {
            const buffer = Buffer.alloc(2);
            Int16LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0x7fff7f && value >= -0x7fff7f)
        {
            const buffer = Buffer.alloc(3);
            Int24LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0x7fffff7f && value >= -0x7fffff7f)
        {
            const buffer = Buffer.alloc(4);
            Int32LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else
            throw new Error('invalid value for vint');
    }
}