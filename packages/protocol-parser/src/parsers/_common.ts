export interface Parser<T>
{
    length: number;
    read(buffer: Buffer, cursor: Cursor): T;
    write(buffer: Buffer, cursor: Cursor, value: T): void;
}
export interface ParserWithMessage<T, TMessage>
{
    length: number;
    read(buffer: Buffer, cursor: Cursor, partial: TMessage): T;
    write(buffer: Buffer, cursor: Cursor, value: T, message: TMessage): void;
}
export interface ParserWithoutKnownLength<T>
{
    length: -1;
    read(buffer: Buffer, cursor: Cursor, message?: unknown): T;
    write(value: T): Buffer[];
}
export interface ParserWithMessageWithoutKnownLength<T, TMessage>
{
    length: -1;
    read(buffer: Buffer, cursor: Cursor, partial: TMessage): T;
    write(value: T, message: TMessage): Buffer[];
}



export type Parsers<T> = Parser<T> | ParserWithoutKnownLength<T>
export type ParsersWithMessage<T, TMessage> = ParserWithMessage<T, TMessage> | ParserWithMessageWithoutKnownLength<T, TMessage>;
export type AnyParser<T, TMessage> = Parsers<T> | ParsersWithMessage<T, TMessage>

export class Cursor
{
    private _offset: number = 0;
    private _floorOffset: number = 0;
    private _subByteOffset: number = 0;
    get offset(): number { return this._offset; };
    set offset(value: number)
    {
        this._offset = value;
        this._floorOffset = Math.floor(value);
        this._subByteOffset = (value - this._floorOffset) * 8;
    };
    get floorOffset(): number { return this._floorOffset };
    get subByteOffset(): number { return this._subByteOffset };

    public freeze()
    {
        var c = new Cursor();
        c._floorOffset = this._floorOffset;
        c._subByteOffset = this._subByteOffset;
        c._offset = this._offset;
        return c;
    }
}

// type IsCursor<T> = (cursor: Cursor | T) => boolean;

export function hasUnknownLength<T, TMessage = unknown>(p: AnyParser<T, TMessage>): p is ParserWithoutKnownLength<T> | ParserWithMessageWithoutKnownLength<T, TMessage>
{
    return p.length == -1;
}

export function parserWrite<T, TMessage = unknown>(parser: AnyParser<T, TMessage>, buffer: Buffer, cursor: Cursor, value: T, message?: TMessage): void
export function parserWrite<T, TMessage = unknown>(parser: AnyParser<T, TMessage>, value: T, message?: TMessage): Buffer[]
export function parserWrite<T, TMessage = unknown>(parser: AnyParser<T, TMessage>, buffer: Buffer | T, cursor: Cursor | TMessage, value?: T, message?: TMessage): Buffer[] | void
export function parserWrite<T, TMessage = unknown>(parser: AnyParser<T, TMessage>, buffer: Buffer | T, cursor: Cursor | TMessage, value?: T, message?: TMessage): Buffer[] | void
{
    if (Buffer.isBuffer(buffer) && cursor instanceof Cursor)
        if (hasUnknownLength(parser))
        {
            if (!(cursor instanceof Cursor))
                throw new Error('no cursor was provided');

            parser.write(value as T, message as TMessage).forEach(b => { b.copy(buffer as Buffer, cursor.offset); cursor.offset += b.length });
        }
        else
        {
            if (!(cursor instanceof Cursor))
                throw new Error('no cursor was provided');

            parser.write(buffer, cursor, value as T, message);
        }
    else
    {
        message = cursor as TMessage;
        value = buffer as T;

        if (hasUnknownLength(parser))
            return parser.write(value, message);
        else
        {
            buffer = Buffer.alloc(Math.ceil(parser.length));
            parser.write(buffer, new Cursor(), value, message);
            return [buffer];
        }
    }
}