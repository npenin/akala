import { buffer } from 'stream/consumers';
import { AnyParser, Cursor, Parser, ParserWithMessage, ParserWithMessageWithoutKnownLength, ParserWithoutKnownLength, parserWrite } from './_common.js';

export default class Skip<TMessage> implements ParserWithMessage<never, TMessage>
{
    constructor(public readonly length: number) { }
    read(buffer: Buffer, cursor: Cursor)
    {
        if (this.length >= 0)
            cursor.offset += this.length;
        else
            cursor.offset += buffer.length
        return null as never;
    }

    write(_buffer: Buffer, cursor: Cursor)
    {
        cursor.offset += this.length;
    }
}


export class SkipParser<TMessage> implements ParserWithMessageWithoutKnownLength<never, TMessage>
{
    public readonly length = -1;

    constructor(private lengthParser: AnyParser<number, unknown>) { }
    read(buffer: Buffer, cursor: Cursor, message: TMessage)
    {
        cursor.offset += this.lengthParser.read(buffer, cursor, message);
        return null as never;
    }

    write()
    {
        const buffer = Buffer.alloc(this.lengthParser.length)
        parserWrite(this.lengthParser, buffer, new Cursor(), 0);
        return [buffer];
    }
}