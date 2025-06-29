import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage } from './_common.js';

export class Prepare<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private prepareMessage: (t: T) => void, private parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }

    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        return this.parser.read(buffer, cursor, message);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        this.prepareMessage(value);
        return this.parser.write(buffer, cursor, value, message);
    }

}
