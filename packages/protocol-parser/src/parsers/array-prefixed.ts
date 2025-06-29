import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor, Parsers } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class PrefixedLengthArray<T, TMessage> implements ParserWithMessage<T[], TMessage>
{
    constructor(private prefix: Parsers<number>, private valueParser: AnyParser<T, TMessage>)
    {
    }
    getLength(value: T[], message?: TMessage): number
    {
        return this.prefix.getLength(value.length) + value?.reduce((previous, current) => previous + this.valueParser.getLength(current, message), 0) || 0;
    }

    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T[]
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor);
        var result: T[] = new Array<T>(length);
        for (let index = 0; index < length; index++)
            result[index] = this.valueParser.read(buffer, cursor, message);
        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[], message: TMessage): IsomorphicBuffer[]
    {
        var buffers: IsomorphicBuffer[] = [];
        this.prefix.write(buffer, cursor, value.length);
        for (let index = 0; index < value.length; index++)
            this.valueParser.write(buffer, cursor, value[index], message);
        return buffers;
    }
}
