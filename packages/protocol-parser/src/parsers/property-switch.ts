import { IsomorphicBuffer } from '@akala/core';
import { type AnyParser, Cursor, type ParserWithMessage } from './_common.js';

export default class SwitchProperty<TMessage, TKey extends keyof TMessage, TKeyAssign extends keyof TMessage, TResult extends TMessage[TKeyAssign], TValue extends (TMessage[TKey] extends PropertyKey ? TMessage[TKey] : never)>
    implements ParserWithMessage<TResult, TMessage>
{
    private parsers: { [key in TValue]: AnyParser<TResult, TMessage[TKeyAssign]> };
    constructor(private name: TKey, private assignProperty: TKeyAssign, parsers: { [key in TValue]: AnyParser<TResult, TMessage[TKeyAssign]> })
    {
        this.parsers = parsers;

    }
    getLength(value: TResult, message?: TMessage): number
    {
        if (!message)
            message = value as unknown as TMessage;
        return this.parsers[message[this.name]].getLength(message[this.assignProperty] as TResult, message[this.assignProperty])
    }
    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): TResult
    {
        var parser = this.parsers[message[this.name] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.name.toString()} in ${JSON.stringify(message)}`);

        message[this.assignProperty] = message[this.assignProperty] || {} as TMessage[TKeyAssign];

        return message[this.assignProperty] = parser.read(buffer, cursor, message[this.assignProperty]) as any;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TResult, message: TMessage): void
    {
        if (typeof (message) == 'undefined')
            throw new Error('no message was provided');

        var parser = this.parsers[message[this.name] as TValue];
        if (!parser)
            throw new Error(`No parser could be found for ${this.name.toString()} in ${JSON.stringify(value)}`);

        parser.write(buffer, cursor, message[this.assignProperty] as TResult, message[this.assignProperty]);
    }

    public register(value: TValue, parser: AnyParser<TResult, TMessage[TKeyAssign]>)
    {
        if (typeof (this.parsers[value]) !== 'undefined')
            throw new Error('a parser is already registered for value ' + value.toString());
        this.parsers[value] = parser;
    }
}
