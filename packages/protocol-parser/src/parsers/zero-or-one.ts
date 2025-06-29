import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor } from './_common.js';
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
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        if (typeof (value) === 'undefined')
            return;
        return this.parser.write(buffer, cursor, value, message);
    }

    length: number;
}
