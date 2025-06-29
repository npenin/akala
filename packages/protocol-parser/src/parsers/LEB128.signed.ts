import { Cursor, Parser } from "./_common.js";
import Uint8 from "./uint8.js";
import Uint7 from "./uint7.js";
import { uint8 } from "../core.js";
import { Int32LE, Int64LE } from "./index.js";
import Int7 from "./int7.js";
import { IsomorphicBuffer } from "@akala/core";

export default class SignedLEB128<T extends number | bigint> implements Parser<T>
{
    constructor(private readonly maxBytes: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 8)
    {

    }

    length: -1 = -1;

    public read(buffer: IsomorphicBuffer, cursor: Cursor): T
    {
        let tmpBuffer = new IsomorphicBuffer(4);
        let value: number;
        const innerCursor = new Cursor();
        if ((value = Uint8.prototype.read(buffer, cursor)) >= 0x7f)
        {
            Uint7.prototype.write(tmpBuffer, innerCursor, value & 0x7f);
            while ((value = Uint8.prototype.read(buffer, cursor)) >= 0x80)
                Uint7.prototype.write(tmpBuffer, innerCursor, value & 0x7f);
        }
        Uint7.prototype.write(tmpBuffer, innerCursor, value & 0x7f);
        switch (Math.ceil(innerCursor.offset))
        {
            case 1:
                return tmpBuffer.readInt8(0) as T;
            case 2:
                return tmpBuffer.readInt16LE(0) as T;
            case 3:
            case 4:
                return tmpBuffer.readInt32LE(0) as T;
            case 5:
            case 6:
            case 7:
            case 8:
                return tmpBuffer.readBigInt64LE(0) as T;
        }
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T): void 
    {
        if (typeof value == 'undefined')
            return null;
        if (value <= 0x3f && value >= -0x3f)
        {
            Int7.prototype.write(buffer, cursor, Number(value));
        }
        else
        {
            try
            {
                const tmpBuffer = new IsomorphicBuffer(this.maxBytes);
                let innerCursor = new Cursor();
                let cursor = new Cursor();
                let tmpValue: uint8;
                const maxBits = this.maxBytes << 3;
                if (this.maxBytes > 4)
                    if (typeof value === 'bigint')
                        Int64LE.prototype.write(tmpBuffer, innerCursor, value);
                    else
                        Int64LE.prototype.write(tmpBuffer, innerCursor, BigInt(value));
                else
                    if (typeof value == 'number')
                        Int32LE.prototype.write(tmpBuffer, innerCursor, value);
                    else
                        Int32LE.prototype.write(tmpBuffer, innerCursor, Number(value));
                innerCursor = new Cursor();
                for (let i = 16; i <= maxBits; i += 8)
                {
                    if (value <= (1n << BigInt(i - 1)) && value >= (-1n << BigInt(i - 1)))
                    {
                        for (let j = i / 8; j > 0; j--)
                        {
                            tmpValue = Uint7.prototype.read(tmpBuffer, innerCursor);
                            if (j === 1)
                                if (tmpValue > 0x3f)
                                {
                                    Uint8.prototype.write(buffer, cursor, tmpValue | 0x80);
                                    tmpValue = Uint7.prototype.read(tmpBuffer, innerCursor);
                                    Uint8.prototype.write(buffer, cursor, tmpValue);
                                }
                                else
                                {
                                    Uint8.prototype.write(buffer, cursor, tmpValue);
                                }
                            else
                            {
                                Uint8.prototype.write(buffer, cursor, tmpValue | 0x80);
                            }
                        }
                    }
                }
            }
            catch (e)
            {
                throw new Error(`An error occured when writing ${value}:`, { cause: e })
            }
        }
    }
}
