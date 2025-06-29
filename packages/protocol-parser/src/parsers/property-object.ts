import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParserWithMessage } from './_common.js';


export default class Property<T extends object, TKey extends keyof T> implements ParserWithMessage<T[TKey], T>
{
    constructor(public readonly name: TKey, private readonly parser: AnyParser<T[TKey], T[TKey]>)
    {
        this.length = parser.length;
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): T[TKey]
    {
        var result: T[TKey];
        if (message && message[this.name])
            result = message[this.name]
        else
            result = {} as T[TKey];

        return message[this.name] = this.parser.read(buffer, cursor, result);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[TKey], message: T): void
    {
        return this.parser.write(buffer, cursor, message[this.name], message[this.name]);
    }
}
