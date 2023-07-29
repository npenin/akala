import { Cursor, ParserWithoutKnownLength } from './_common.js';
import Uint16LE from './uint16LE.js';
import Uint24LE from './uint24LE.js';
import Uint32LE from './uint32LE.js';
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
                return tmpBuffer.readUInt8(0);
            case 2:
                return tmpBuffer.readUInt16LE(0);
            case 3:
                return tmpBuffer.readUInt8(2) << 16 + tmpBuffer.readUInt16LE(0);
            case 4:
                return tmpBuffer.readUInt32LE(0);
        }
    }

    public write(value: number)
    {
        if (value <= 0x7f)
        {
            const buffer = Buffer.alloc(1);
            Uint8.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0xff7f)
        {
            const buffer = Buffer.alloc(2);
            Uint16LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0xffff7f)
        {
            const buffer = Buffer.alloc(3);
            Uint24LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else if (value <= 0xffffff7f)
        {
            const buffer = Buffer.alloc(4);
            Uint32LE.prototype.write(buffer, new Cursor(), value);
            return [buffer];
        }
        else
            throw new Error('invalid value for vuint');
    }
}