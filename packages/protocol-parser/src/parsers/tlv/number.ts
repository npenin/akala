import { IsomorphicBuffer } from "@akala/core";
import { Cursor, Parser, Parsers } from "../_common.js";

export class TLVNumber implements Parser<number>
{
    private readonly _length: number;
    constructor(private readonly lengthParser: Parsers<number>)//, private readonly maxLength: number)
    {
        this.length = lengthParser.length * 2;
        this._length = lengthParser.length;
    }
    getLength(value: number): number
    {
        return this.length;
    }

    public readonly length: number;

    read(buffer: IsomorphicBuffer, cursor: Cursor): number
    {
        this.lengthParser.read(buffer, cursor);
        return this.lengthParser.read(buffer, cursor);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: number): void
    {
        this.lengthParser.write(buffer, cursor, this._length);
        this.lengthParser.write(buffer, cursor, value);
    }

}
