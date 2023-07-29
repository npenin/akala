import { ParserWithMessage } from "./index.js";
import Series from './series.js';
import { Cursor, ParserWithMessageWithoutKnownLength } from './_common.js';

export default class Between<TMessage> extends Series<TMessage> implements ParserWithMessageWithoutKnownLength<TMessage, Partial<TMessage>>
{
    constructor(start: ParserWithMessage<any, TMessage>, parser: ParserWithMessageWithoutKnownLength<any, TMessage>, end: ParserWithMessage<any, TMessage>)
    {
        super(start, parser, end);
    }

    read(buffer: Buffer, cursor: Cursor, message: TMessage): TMessage
    {
        const newCursor = new Cursor();
        this.parsers[0].read(buffer, cursor, message);
        this.parsers[1].read(buffer.slice(cursor.offset, buffer.length - this.parsers[2].length), newCursor, message);
        cursor.offset += newCursor.offset;
        this.parsers[2].read(buffer, cursor, message);

        return message;
    }
    write(buffer: Buffer | TMessage, cursor: Cursor | Partial<TMessage>, value?: TMessage, message?: Partial<TMessage>)
    {
        return super.write(buffer, cursor, value, message);
    }

}