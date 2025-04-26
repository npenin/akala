import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessageWithoutKnownLength, parserWrite } from './_common.js';

export default class SwitchProperty<T, TKey extends keyof T, TKeyAssign extends keyof T, TResult extends T[TKeyAssign], TValue extends (T[TKey] extends PropertyKey ? T[TKey] : never)>
    implements ParserWithMessageWithoutKnownLength<TResult, T>
{
    private parsers: { [key in TValue]: AnyParser<TResult, T[TKeyAssign]> };
    constructor(private name: TKey, private assignProperty: TKeyAssign, parsers: { [key in TValue]: AnyParser<TResult, T[TKeyAssign]> })
    {
        this.parsers = parsers;

    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): TResult
    {
        var parser = this.parsers[message[this.name] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.name.toString()} in ${JSON.stringify(message)}`);

        message[this.assignProperty] = message[this.assignProperty] || {} as T[TKeyAssign];

        return message[this.assignProperty] = parser.read(buffer, cursor, message[this.assignProperty]) as any;
    }
    write(value: TResult, message: T): IsomorphicBuffer[]
    {
        if (typeof (message) == 'undefined')
            throw new Error('no message was provided');

        var parser = this.parsers[message[this.name] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.name.toString()} in ${JSON.stringify(value)}`);

        return parserWrite(parser, message[this.assignProperty], message);
    }

    public register(value: TValue, parser: AnyParser<TResult, T[TKeyAssign]>)
    {
        if (typeof (this.parsers[value]) !== 'undefined')
            throw new Error('a parser is already registered for value ' + value.toString());
        this.parsers[value] = parser;
    }
}
