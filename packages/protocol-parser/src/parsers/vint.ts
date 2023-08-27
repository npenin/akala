import { Cursor, ParserWithoutKnownLength } from './_common.js';
import Int16 from './int16.js';
import Int24 from './int24.js';
import Int32 from './int32.js';
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
            tmpBuffer.writeInt8(value, tmpOffset++);
        switch (tmpOffset)
        {
            case 1:
                return tmpBuffer.readInt8(0);
            case 2:
                return tmpBuffer.readInt16BE(0);
            case 3:
                return tmpBuffer.readInt8(0) << 16 + tmpBuffer.readInt16BE(1);
            case 4:
                return tmpBuffer.readInt32BE(0);
        }
        return value;
    }

    public write(value: number)
    {
        if (value <= 0x3f && value >= 0x3f)
        {
            const buffer = Buffer.alloc(1);
            Int8.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0x7f7f && value >= -0x7f7f)
        {
            const buffer = Buffer.alloc(2);
            Int16.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        } else if (value <= 0x7fff7f && value >= 0x7fff7f)
        {
            const buffer = Buffer.alloc(3);
            Int24.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        } else if (value <= 0x7fffffff && value >= -0x7fffffff)
        {
            const buffer = Buffer.alloc(4);
            Int32.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else
            throw new Error(`invalid value '${value}' for vuint`);
    }
}