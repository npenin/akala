import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage, parserWrite } from './_common.js';

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

    write(value: T, message: TMessage): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: IsomorphicBuffer | T, cursor?: Cursor | TMessage, value?: T, message?: TMessage)
    {

        if (buffer instanceof IsomorphicBuffer && cursor instanceof Cursor)
        {
            this.prepareMessage(value);
            return parserWrite(this.parser, buffer, cursor, value, message);
        }
        else
        {
            this.prepareMessage(buffer as T);
            return parserWrite(this.parser, buffer, cursor, value, message);
        }

    }

}
