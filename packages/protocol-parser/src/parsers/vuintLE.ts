import { IsomorphicBuffer } from '@akala/core';
import { Cursor, Parser } from './_common.js';
import Uint16LE from './uint16LE.js';
import Uint24LE from './uint24LE.js';
import Uint32LE from './uint32LE.js';
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
            return 1;
        else if (value <= 0xff7f)
            return 2;
        else if (value <= 0xffff7f)
            return 3;
        else if (value <= 0xffffff7f)
            return 4;
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
                return tmpBuffer.readUInt16LE(0);
            case 3:
                return tmpBuffer.readUInt8(2) << 16 + tmpBuffer.readUInt16LE(0);
            case 4:
                return tmpBuffer.readUInt32LE(0);
        }
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: number): void
    {
        if (value <= 0x7f)
            Uint8.prototype.write(buffer, cursor, value);
        else if (value <= 0xff7f)
            Uint16LE.prototype.write(buffer, cursor, value);
        else if (value <= 0xffff7f)
            Uint24LE.prototype.write(buffer, cursor, value);
        else if (value <= 0xffffff7f)
            Uint32LE.prototype.write(buffer, cursor, value);
        else
            throw new Error('invalid value for vuint');
    }
}
