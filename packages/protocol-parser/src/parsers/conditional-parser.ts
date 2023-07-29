import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor, parserWrite } from './_common.js';

export class Conditional<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(private condition: (message: TMessage) => boolean, private parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    read(buffer: Buffer, cursor: Cursor, partial: TMessage): T
    {
        if (this.condition(partial))
            return this.parser.read(buffer, cursor, partial);
        return undefined;
    }
    write(value: T, message: TMessage): Buffer[]
    write(buffer: Buffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: Buffer | T, cursor: Cursor | TMessage, value?: T, message?: TMessage): void | Buffer[]
    {
        if (this.condition(message))
            return parserWrite(this.parser, buffer, cursor, value, message);
    }

    length: number;
}