import { Cursor, Parser, Parsers, parserWrite } from "../_common.js";

export class TLVNumber implements Parser<number>
{
    private readonly _length: number;
    constructor(private readonly lengthParser: Parsers<number>, private readonly maxLength: number)
    {
        this.length = lengthParser.length * 2;
        this._length = lengthParser.length;
    }

    public readonly length: number;

    read(buffer: Buffer, cursor: Cursor): number
    {
        this.lengthParser.read(buffer, cursor);
        return this.lengthParser.read(buffer, cursor);
    }

    write(buffer: Buffer, cursor: Cursor, value: number): void
    {
        parserWrite(this.lengthParser, buffer, cursor, this._length);
        parserWrite(this.lengthParser, buffer, cursor, value);
    }

}