import { IsomorphicBuffer } from "@akala/core";
import { Cursor, type AnyParser, type ParserWithMessage } from "../_common.js";
import { type WireType } from './field.js';
import { type ArrayItem } from './property.js';

export default class PackedProperty<T, TKey extends keyof T> implements ParserWithMessage<ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, T>
{
    constructor(private name: TKey, public readonly wireType: WireType, private parser: AnyParser<ArrayItem<T[TKey]>, Partial<ArrayItem<T[TKey]>>>)
    {
        this.length = parser.length;
    }
    getLength(value: ArrayItem<T[TKey]> | ArrayItem<T[TKey]>[], message?: T): number
    {
        let x = 0;
        if (typeof value === 'undefined')
            return x;

        var value = message[this.name] as ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>;
        if (Array.isArray(value))
            for (var v of value)
                x += this.parser.getLength(v, v);
        else
            return this.parser.getLength(value as any, value);
    }

    length: number;

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>
    {
        var result: ArrayItem<T[TKey]>[] = message[this.name] as any;
        if (typeof result == 'undefined')
            message[this.name] = this.parser.read(buffer, cursor, message as unknown as Partial<ArrayItem<T[TKey]>>) as any;
        else
        {
            if (!Array.isArray(result))
                message[this.name] = [result] as any;
            result.push(this.parser.read(buffer, cursor, message as unknown as Partial<ArrayItem<T[TKey]>>));
            return result;
        }
        return message[this.name] as ArrayItem<T[TKey]>;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, message: T): void
    {
        if (typeof value === 'undefined')
            return;

        var value = message[this.name] as ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>;
        if (Array.isArray(value))
            for (var v of value)
                this.parser.write(buffer, cursor, v, v);
        else if (typeof (value) === 'undefined')
            return null;
        else
            return this.parser.write(buffer, cursor, value as any, value);
    }
}
