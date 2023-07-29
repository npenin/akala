import { AnyParser, ParserWithMessageWithoutKnownLength } from "./index.js";
import { Cursor, Parsers, parserWrite } from './_common.js';

export default class PrefixedLengthSeries<T, TMessage> implements ParserWithMessageWithoutKnownLength<T, TMessage>
{
    constructor(private prefix: Parsers<number>, private valueParser: AnyParser<T, TMessage>)
    {
    }

    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor, message: TMessage): T
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        var length = this.prefix.read(buffer, cursor);
        return this.valueParser.read(buffer.slice(0, length), cursor, message);
    }

    write(value: T, message: TMessage): Buffer[]
    {
        var valueBuffers = Buffer.concat(parserWrite(this.valueParser, value, message));
        var buffers: Buffer[] = [];
        buffers.push(...parserWrite(this.prefix, valueBuffers.length, message));
        buffers.push(valueBuffers)
        return buffers;
    }
}