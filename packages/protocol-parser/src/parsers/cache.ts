import { AnyParser, Cursor, ParserWithMessage, parserWrite } from './_common.js';


export default class Cache<T extends string | number | symbol, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(protected readonly parser: AnyParser<T, TMessage>)
    {
        this.length = parser.length;
    }
    length: number;
    read(buffer: Buffer, cursor: Cursor, message: TMessage): T
    {
        return this.parser.read(buffer, cursor, message);
    }

    private readonly cache = {} as Record<T, Buffer[]>;


    write(value: T, message: TMessage): Buffer[]
    write(buffer: Buffer, cursor: Cursor, value: T, message: TMessage): void
    write(buffer: Buffer | T, cursor?: Cursor | TMessage, value?: T, message?: TMessage)
    {
        if (!Buffer.isBuffer(buffer))
        {
            if (typeof (this.cache[buffer]) !== 'undefined')
                return this.cache[buffer]
            return this.cache[buffer] = parserWrite(this.parser, buffer, cursor);
        }
        if (typeof (this.cache[value]) === 'undefined')
            this.cache[value] = parserWrite(this.parser, value, message);
        const buffers = Buffer.concat(this.cache[value]);
        buffers.copy(buffer, (cursor as Cursor).offset);
        (cursor as Cursor).offset += buffers.length;
    }
}