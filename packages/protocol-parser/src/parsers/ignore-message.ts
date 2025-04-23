import { IsomorphicBuffer } from "@akala/core";
import { AnyParser, Cursor, ParserWithMessage, parserWrite } from "./_common.js";

export class Ignore<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private inner: AnyParser<T, any>)
    {

    }
    get length() { return this.inner.length };
    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T
    {
        return this.inner.read(buffer, cursor, undefined);
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        return parserWrite(this.inner, buffer, cursor, value);
    }

}
