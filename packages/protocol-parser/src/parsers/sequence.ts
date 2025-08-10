import { IsomorphicBuffer } from '@akala/core';
import { type AnyParser, Cursor, type ParserWithMessage } from './_common.js';

export default class Sequence<T extends unknown[], TMessage = unknown> implements ParserWithMessage<T, TMessage>
{
    private parsers: { [key in keyof T]: AnyParser<T[key], TMessage> };
    constructor(...parsers: { [key in keyof T]: AnyParser<T[key], TMessage> })
    {
        this.parsers = parsers;
        for (const parser of parsers)
        {
            if (parser.length == -1)
            {
                this.length = -1;
                break;
            }
            this.length += parser.length;
        }
    }
    getLength(value: T, message?: TMessage): number
    {
        if (this.length == -1)
            return this.parsers.reduce((previous, current) => previous + current.getLength(value, message), 0)
        return this.length;
    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        var result = [];
        for (const parser of this.parsers)
        {
            result.push(parser.read(buffer, cursor, message));
        }
        return result as T;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void
    {
        for (let index = 0; index < value.length; index++)
            this.parsers[index].write(buffer, cursor, value[index], message);
    }

}
