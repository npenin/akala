import { IsomorphicBuffer } from '@akala/core';
import { Cursor, ParsersWithMessage, ParserWithMessage } from './_common.js';

export default class Series<T extends TMessage, TMessage> implements ParserWithMessage<TMessage, TMessage>
{
    protected parsers: ParsersWithMessage<any, TMessage>[];
    protected lengths: number[] = [];
    constructor(...parsers: ParsersWithMessage<any, TMessage>[])
    {
        this.parsers = parsers;
        for (const parser of parsers)
            this.lengths.push(parser.length)
        this.length = this.lengths.reduce((previous, current) =>
        {
            if (previous == -1)
                return -1;
            if (current == -1)
                return -1;
            return current + previous;
        }, 0) as -1;
    }

    getLength(value: TMessage, message?: TMessage): number
    {
        if (this.length == -1)
            return this.parsers.reduce((previous, current) => previous + current.getLength(value, message), 0)
        return this.length;
    }
    length: -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): TMessage
    {
        for (const parser of this.parsers)
        {
            parser.read(buffer, cursor, message);
        }

        return message;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: T, message?: TMessage)
    {
        for (let index = 0; index < this.parsers.length; index++)
            this.parsers[index].write(buffer, cursor as Cursor, value, value || message);
    }

}
