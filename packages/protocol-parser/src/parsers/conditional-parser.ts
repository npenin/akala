import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor, parserWrite } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export class Conditional<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private condition: (message: TMessage) => boolean, private parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T
    {
        if (this.condition(partial))
            return this.parser.read(buffer, cursor, partial);
        return undefined;
    }
    write(value: T, message: TMessage): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: IsomorphicBuffer | T, cursor: Cursor | TMessage, value?: T, message?: TMessage): void | IsomorphicBuffer[]
    {
        if (this.condition(message))
            return parserWrite(this.parser, buffer, cursor, value, message);
    }

    length: number;
}
