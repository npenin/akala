import { AnyParser, ParserWithMessageWithoutKnownLength } from "./index.js";
import { Cursor, parserWrite } from './_common.js';

export default class PreparsedLengthArray<T, TMessage> implements ParserWithMessageWithoutKnownLength<T[], TMessage>
{
    constructor(private prefix: keyof TMessage, private valueParser: AnyParser<T, TMessage>)
    {
    }

    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor, message: TMessage): T[]
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = message[this.prefix] as unknown as number;
        var result: T[] = new Array<T>(length);
        for (let index = 0; index < length; index++)
            result[index] = this.valueParser.read(buffer, cursor, message);
        return result;
    }

    write(value: T[], message: TMessage): Buffer[]
    {
        var buffers: Buffer[] = [];
        for (let index = 0; index < (message[this.prefix] as unknown as number); index++)
            buffers.push(...parserWrite(this.valueParser, value[index], message));
        return buffers;
    }
}