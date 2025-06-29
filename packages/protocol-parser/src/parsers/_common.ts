import { ErrorWithStatus, IsomorphicBuffer } from "@akala/core";

export interface Parser<T>
{
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor): T;
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T): void;
    getLength(value: T): number;
}
export interface ParserWithMessage<T, TMessage>
{
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, partial: TMessage): T;
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: T, message: TMessage): void;
    getLength(value: T, message?: TMessage): number;
}


export type Parsers<T> = Parser<T>
export type ParsersWithMessage<T, TMessage> = ParserWithMessage<T, TMessage>;
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

export function parserWrite<T, TMessage>(parser: AnyParser<T, unknown>, value: T, message: TMessage = null, bufferSize = 1024)
{
    if (bufferSize == 0)
        bufferSize = parser.getLength(value, message);
    if (bufferSize <= 0)
        throw new ErrorWithStatus(400, `Buffer size (${bufferSize}) needs to be set to a positive value`);

    const buffer = new IsomorphicBuffer(bufferSize);

    const cursor = new Cursor();
    parser.write(buffer, cursor, value, message)

    if (buffer.length == Math.ceil(cursor.offset))
        return buffer;
    return buffer.subarray(0, Math.ceil(cursor.offset));
}
