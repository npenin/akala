import { Cursor, Parser } from './_common.js';
import Uint8 from './uint8.js';
import { int32 } from "../core.js";

export default class Int24LE implements Parser<int32>
{
    constructor()
    {

    }

    length = 3;

    public read(buffer: Buffer, cursor: Cursor): int32
    {
        let tmpBuffer = Buffer.alloc(4);
        tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 0);
        tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 1);
        tmpBuffer.writeUInt8(Uint8.prototype.read(buffer, cursor), 2);
        return tmpBuffer.readInt32LE(0);
    }

    public write(buffer: Buffer, cursor: Cursor, value: int32)
    {
        let tmpBuffer = Buffer.alloc(4);
        tmpBuffer.writeInt32LE(value, 0);
        Uint8.prototype.write(buffer, cursor, tmpBuffer.readUInt8(0));
        Uint8.prototype.write(buffer, cursor, tmpBuffer.readUInt8(1));
        Uint8.prototype.write(buffer, cursor, tmpBuffer.readUInt8(2));
    }
}