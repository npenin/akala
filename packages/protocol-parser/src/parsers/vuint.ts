import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';
import Uint16 from './uint16.js';
import Uint24 from './uint24.js';
import Uint32 from './uint32.js';
import Uint8 from './uint8.js';

export default class Vuint implements Parser<number>
{
    constructor()
    {

    }

    length: -1 = -1;

    getLength(value: number): number
    {
        if (value <= 0x7f)
            return Uint8.prototype.length;
        else if (value <= 0xff7f)
            return Uint16.prototype.length;
        else if (value <= 0xffff7f)
            return Uint24.prototype.length;
        else if (value <= 0xffffff7f)
            return Uint32.prototype.length;
        else
            throw new Error('invalid value for vuint');
    }

    public read(buffer: IsomorphicBuffer, cursor: Cursor): number
    {
        let tmpBuffer = new IsomorphicBuffer(4);
        let value: number;
        let tmpOffset = 0;
        while (tmpOffset < 4 && (value = Uint8.prototype.read(buffer, cursor)) > 0x7f)
            tmpBuffer.writeUInt8(value, tmpOffset++);
        switch (tmpOffset)
        {
            case 1:
                return tmpBuffer.readUInt8(0);
            case 2:
                return tmpBuffer.readUInt16BE(0);
            case 3:
                return tmpBuffer.readUInt8(0) << 16 + tmpBuffer.readUInt16BE(1);
            case 4:
                return tmpBuffer.readUInt32BE(0);
        }
        return value;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: number): void
    {
        if (value <= 0x7f)
            Uint8.prototype.write(buffer, cursor, value);
        else if (value <= 0xff7f)
            Uint16.prototype.write(buffer, cursor, value);
        else if (value <= 0xffff7f)
            Uint24.prototype.write(buffer, cursor, value);
        else if (value <= 0xffffff7f)
            Uint32.prototype.write(buffer, cursor, value);
        else
            throw new Error('invalid value for vuint');
    }
}
