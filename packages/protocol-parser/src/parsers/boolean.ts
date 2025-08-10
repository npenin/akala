
import { IsomorphicBuffer } from '@akala/core';
import { Cursor, type Parser } from './_common.js';


export default class Boolean implements Parser<boolean>
{
    constructor(private parser: Parser<number>)
    {
        this.length = parser.length;
    }
    getLength(value: boolean): number
    {
        return this.parser.getLength(value && 1 || 0);
    }



    public length: number;

    public read(buffer: IsomorphicBuffer, cursor: Cursor): boolean
    {
        return this.parser.read(buffer, cursor) === 1;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: boolean)
    {
        return this.parser.write(buffer, cursor, value && 1 || 0);

    }
}
