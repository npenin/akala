import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage, parserWrite } from './_common.js';


export default class Cache<T extends PropertyKey, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(protected readonly parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        return this.parser.read(buffer, cursor, message);
    }

    private readonly cache = {} as Record<T, IsomorphicBuffer[]>;


    write(value: T, message: TMessage): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: IsomorphicBuffer | T, cursor?: Cursor | TMessage, value?: T, message?: TMessage)
    {
        if (!(buffer instanceof IsomorphicBuffer))
        {
            if (typeof (this.cache[buffer]) !== 'undefined')
                return this.cache[buffer]
            return this.cache[buffer] = parserWrite(this.parser, buffer, cursor);
        }
        if (typeof (this.cache[value]) === 'undefined')
            this.cache[value] = parserWrite(this.parser, value, message);
        const buffers = IsomorphicBuffer.concat(this.cache[value]);
        buffers.copy(buffer, (cursor as Cursor).offset);
        (cursor as Cursor).offset += buffers.length;
    }
}
