import { IsomorphicBuffer } from '@akala/core';
import { type AnyParser, Cursor, type ParserWithMessage } from './_common.js';

export class Prepare<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    private prepared: TMessage = null;

    constructor(private prepareMessage: (t: T) => void, private parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }

    getLength(value: T, message?: TMessage): number
    {
        if (this.prepared !== message)
        {
            this.prepareMessage(value);
            this.prepared = message;
        }
        return this.parser.getLength(value, message);
    }

    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        return this.parser.read(buffer, cursor, message);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        if (this.prepared !== message)
        {
            this.prepareMessage(value);
            this.prepared = message;
        }

        return this.parser.write(buffer, cursor, value, message);
    }

}
