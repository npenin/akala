import { IsomorphicBuffer } from '@akala/core';
import { AnyParser, Cursor, ParsersWithMessage } from './_common.js';


export default class Property<T extends { [key in TKey]: Exclude<any, object> }, TKey extends keyof T> implements ParsersWithMessage<T[TKey], T>
{
    constructor(public readonly name: TKey, protected readonly parser: AnyParser<T[TKey], T>)
    {
        this.length = parser.length;
    }

    getCacheKey(value: T[TKey], message: T): void | undefined | string
    {
        value = message[this.name];
        switch (typeof value)
        {
            case 'string':
            case 'boolean':
            case 'symbol':
                return value;
            case 'bigint':
                return value ? value.toString() : '';
            case 'number':
                return value ? value.toString() : '';
            case 'undefined':
                return '';
            case 'object':
                if (value === null)
                    return '';
        }
    }

    getLength(value: T[TKey], message?: T): number
    {
        return this.parser.getLength(value[this.name], message)
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): T[TKey]
    {
        return message[this.name] = this.parser.read(buffer, cursor, message);
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[TKey], message: T): void
    {
        return this.parser.write(buffer, cursor, value[this.name], message);
    }
}
