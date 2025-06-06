import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage, parserWrite } from './_common.js';


export default class Property<T extends { [key in TKey]: Exclude<any, object> }, TKey extends keyof T> implements ParserWithMessage<T[TKey], T>
{
    constructor(public readonly name: TKey, protected readonly parser: AnyParser<T[TKey], T>)
    {
        this.length = parser.length;
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): T[TKey]
    {
        return message[this.name] = this.parser.read(buffer, cursor, message);
    }

    write(value: T, message: T): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[TKey], message: T): void
    write(buffer: IsomorphicBuffer | T, cursor?: Cursor | T, value?: T[TKey], message?: T)
    {
        if (!(buffer instanceof IsomorphicBuffer))
            return parserWrite(this.parser, buffer[this.name], buffer);
        return parserWrite(this.parser, buffer, cursor as Cursor, value[this.name], message);
    }
}
