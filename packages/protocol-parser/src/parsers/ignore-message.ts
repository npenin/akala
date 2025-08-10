import { IsomorphicBuffer } from "@akala/core";
import { type AnyParser, Cursor, type ParserWithMessage } from "./_common.js";

export class Ignore<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private inner: AnyParser<T, any>)
    {

    }
    get length() { return this.inner.length };

    getLength(value: T): number
    {
        return this.inner.getLength(value);
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T
    {
        return this.inner.read(buffer, cursor, undefined);
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void 
    {
        return this.inner.write(buffer, cursor, value, null);
    }

}
