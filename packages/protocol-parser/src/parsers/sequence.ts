import { AnyParser, Cursor, ParserWithMessageWithoutKnownLength, parserWrite } from './_common.js';

export default class Sequence<T extends unknown[], TMessage = unknown> implements ParserWithMessageWithoutKnownLength<T, TMessage>
{
    private parsers: AnyParser<T, TMessage>[];
    constructor(...parsers: AnyParser<T, TMessage>[])
    {
        this.parsers = parsers;
        for (const parser of parsers)
        {
            if (parser.length == -1)
            {
                this.length = -1;
                break;
            }
            this.length += parser.length;
        }
    }
    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor, message: TMessage): T
    {
        var result = [];
        for (const parser of this.parsers)
        {
            result.push(parser.read(buffer, cursor, message));
        }
        return result as T;
    }
    write(value: T, message: TMessage)
    {
        var buffers: Buffer[] = [];
        for (let index = 0; index < value.length; index++)
            buffers.push(...parserWrite(this.parsers[index], value[index], message));
        return buffers;
    }

}