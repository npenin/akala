import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class FixedLengthArray<T, TMessage> implements ParserWithMessage<T[], TMessage>
{
    constructor(public readonly length: number, protected readonly valueParser: AnyParser<T, TMessage>)
    {
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T[]
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var result: T[];
        if (this.length == -1)
        {
            result = [];
            while (cursor.offset < buffer.length)
                result.push(this.valueParser.read(buffer, cursor, message));
        }
        else
        {
            result = new Array<T>(this.length);
            for (let index = 0; index < this.length; index++)
                result[index] = this.valueParser.read(buffer, cursor, message);
        }
        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[], message: TMessage): void
    {
        for (let index = 0; index < this.length; index++)
            this.valueParser.write(buffer, cursor, value[index], message);
    }
}
