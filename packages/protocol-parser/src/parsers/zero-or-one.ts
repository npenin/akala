import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor, parserWrite } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export class ZeroOrOne<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T
    {
        if (buffer.length > cursor.offset)
            return this.parser.read(buffer, cursor, partial);
        return undefined;
    }
    write(value: T, message: TMessage): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: IsomorphicBuffer | T, cursor: Cursor | TMessage, value?: T, message?: TMessage): void | IsomorphicBuffer[]
    {
        if (!(buffer instanceof IsomorphicBuffer))
            value = buffer;
        if (typeof (value) === 'undefined')
            return null;
        return parserWrite(this.parser, buffer, cursor, value, message);
    }

    length: number;
}
