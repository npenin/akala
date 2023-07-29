import { Cursor, AnyParser, ParserWithMessage, parserWrite } from "../_common.js";
import { WireType } from './field.js';
import { ArrayItem } from './property.js';

export default class PackedProperty<T, TKey extends keyof T> implements ParserWithMessage<ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, T>
{
    constructor(private name: TKey, public readonly wireType: WireType, private parser: AnyParser<ArrayItem<T[TKey]>, Partial<ArrayItem<T[TKey]>>>)
    {
        this.length = parser.length;
    }

    length: number;

    read(buffer: Buffer, cursor: Cursor, message: T): ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>
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

    write(value: ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, message: T): Buffer[]
    write(buffer: Buffer, cursor: Cursor, value: ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, message: T): void
    write(buffer: Buffer | ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, cursor?: Cursor | T, value?: ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>, message?: T)
    {
        if (!(cursor instanceof Cursor))
            message = cursor;
        if (!Buffer.isBuffer(buffer))
            value = buffer;
        if (typeof value === 'undefined')
            return null;
        var buffers = [];

        var value = message[this.name] as ArrayItem<T[TKey]>[] | ArrayItem<T[TKey]>;
        if (Array.isArray(value))
            for (var v of value)
                buffers.push(...parserWrite(this.parser, v, v));
        else if (typeof (value) === 'undefined')
            return null;
        else
            return parserWrite(this.parser, value as any, value);
        return buffers;
    }
}