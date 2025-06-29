import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage } from './_common.js';

export default class Skip<TMessage> implements ParserWithMessage<never, TMessage>
{
    constructor(public readonly length: number) { }
    read(buffer: IsomorphicBuffer, cursor: Cursor)
    {
        if (this.length >= 0)
            cursor.offset += this.length;
        else
            cursor.offset += buffer.length
        return null as never;
    }

    write(_buffer: IsomorphicBuffer, cursor: Cursor)
    {
        cursor.offset += this.length;
    }
}


export class SkipParser<TMessage> implements ParserWithMessage<never, TMessage>
{
    public readonly length = -1;

    constructor(private lengthParser: AnyParser<number, unknown>) { }
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage)
    {
        cursor.offset += this.lengthParser.read(buffer, cursor, message);
        return null as never;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor)
    {
        this.lengthParser.write(buffer, cursor, 0, null);
        return [buffer];
    }
}
