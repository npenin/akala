
import { Cursor, Parser } from './_common.js';


export default class Boolean implements Parser<boolean>
{
    constructor(private parser: Parser<number>)
    {
        this.length = parser.length;
    }

    public length: number;

    public read(buffer: Buffer, cursor: Cursor): boolean
    {
        return this.parser.read(buffer, cursor) === 1;
    }

    public write(buffer: Buffer, cursor: Cursor, value: boolean)
    {
        return this.parser.write(buffer, cursor, value && 1 || 0);

    }
}