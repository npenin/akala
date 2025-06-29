import { AnyParser, ParserWithMessage } from "./index.js";
import { Cursor } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class PreparsedLengthArray<T, TMessage> implements ParserWithMessage<T[], TMessage>
{
    constructor(private prefix: keyof TMessage, private valueParser: AnyParser<T, TMessage>)
    {
    }

    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T[] 
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = message[this.prefix] as unknown as number;
        var result: T[] = new Array<T>(length);
        for (let index = 0; index < length; index++)
            result[index] = this.valueParser.read(buffer, cursor, message);
        return result;
    }

    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T[], message: TMessage)
    {
        for (let index = 0; index < (message[this.prefix] as unknown as number); index++)
            this.valueParser.write(buffer, cursor, value[index], message);
    }
}
