import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage } from './_common.js';


export default class Cache<T extends PropertyKey, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(protected readonly parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    getLength(value: T, message?: TMessage): number
    {
        if (this.cache.has(value))
            return this.cache.get(value).length;
        return this.parser.getLength(value);
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        return this.parser.read(buffer, cursor, message);
    }

    private readonly cache = new Map<any, IsomorphicBuffer>();


    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        const offset = cursor.offset;
        if (!this.cache.has(value))
        {
            this.parser.write(buffer, cursor, value, message);
            this.cache.set(value, buffer.subarray(offset, cursor.offset));
        }
        else
        {
            buffer.copy(this.cache.get(value), cursor.offset);
            cursor.offset += this.cache.get(value).length
        }
    }
}
