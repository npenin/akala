import { Cursor, ParsersWithMessage, ParserWithMessageWithoutKnownLength, parserWrite } from './_common.js';

export default class Series<TMessage> implements ParserWithMessageWithoutKnownLength<TMessage, Partial<TMessage>>
{
    protected parsers: ParsersWithMessage<any, TMessage>[];
    protected lengths: number[] = [];
    constructor(...parsers: ParsersWithMessage<any, TMessage>[])
    {
        this.parsers = parsers;
        for (const parser of parsers)
            this.lengths.push(parser.length)
        this.length = this.lengths.reduce((previous, current) =>
        {
            if (previous == -1)
                return -1;
            if (current == -1)
                return -1;
            return current + previous;
        }, 0) as -1;
    }
    length: -1;
    read(buffer: Buffer, cursor: Cursor, message: TMessage): TMessage
    {
        for (const parser of this.parsers)
        {
            parser.read(buffer, cursor, message);
        }

        return message;
    }
    write(buffer: Buffer | TMessage, cursor: Cursor | Partial<TMessage>, value?: TMessage, message?: Partial<TMessage>)
    {

        if (Buffer.isBuffer(buffer) && cursor instanceof Cursor)
        {
            for (let index = 0; index < this.parsers.length; index++)
                parserWrite(this.parsers[index], buffer, cursor as Cursor, value, message);
            return [];
        }
        value = buffer as TMessage;
        message = cursor as TMessage;
        if (this.length > -1)
        {
            buffer = Buffer.alloc(Math.ceil(length));
            this.write(buffer, new Cursor(), value, message);
            return [buffer];
        }

        var buffers: Buffer[] = [];

        for (let index = 0; index < this.parsers.length; index++)
        {
            buffers.push(...parserWrite(this.parsers[index], value, message || value));
        }

        return buffers;
    }

}