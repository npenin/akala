import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export class Conditional<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private condition: (message: TMessage) => boolean, private readonly parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T
    {
        if (this.condition(partial))
            return this.parser.read(buffer, cursor, partial);
        return undefined;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        if (this.condition(message))
            return this.parser.write(buffer, cursor, value, message);
    }

    readonly length: number;
}
