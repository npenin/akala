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
        const cacheKey = this.parser.getCacheKey?.(value, message);
        if (typeof cacheKey !== 'string')
            return this.parser.write(buffer, cursor, value, message);

        if (!this.cache.has(cacheKey))
        {
            this.parser.write(buffer, cursor, value, message);
            this.cache.set(cacheKey, buffer.subarray(offset, cursor.offset));
        }
        else
        {
            var cached = this.cache.get(cacheKey)
            buffer.copy(cached, cursor.offset);
            cursor.offset += cached.length;
        }
    }
}
