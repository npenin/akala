import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessageWithoutKnownLength, parserWrite } from './_common.js';

export default class Switch<T extends { [key in keyof T]: TValue }, TResult, TValue extends PropertyKey> implements ParserWithMessageWithoutKnownLength<TResult, T>
{
    private parsers: Partial<{ [key in TValue]: AnyParser<TResult, T> }>;
    constructor(private condition: keyof { [key in keyof T]: T[key] extends TValue ? T[key] : never } | ((x: T) => TValue), parsers: Partial<{ [key in TValue]: AnyParser<TResult, T> }>)
    {
        this.parsers = parsers;
    }
    register(key: TValue, parser: AnyParser<TResult, T>)
    {
        if (key in this.parsers)
            throw new Error(`a parser for ${key.toString()} is already registered`);

        this.parsers[key] = parser;
    }

    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): TResult
    {
        if (typeof this.condition == 'function')
            var parser = this.parsers[this.condition(message)];
        else
            var parser = this.parsers[message[this.condition] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.condition.toString()} in ${JSON.stringify(message)}`);

        return parser.read(buffer, cursor, message);
    }
    write(value: TResult, message: T): IsomorphicBuffer[]
    {
        if (typeof (message) == 'undefined')
            throw new Error('no message was provided');

        if (typeof this.condition == 'function')
            var parser = this.parsers[this.condition(message)];
        else
            var parser = this.parsers[message[this.condition] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.condition.toString()} in ${JSON.stringify(value)}`);

        return parserWrite(parser, value, message);
    }

}
