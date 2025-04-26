import { ParserWithMessage } from "./index.js";
import Series from './series.js';
import { Cursor, ParserWithMessageWithoutKnownLength } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class Between<TMessage> extends Series<TMessage> implements ParserWithMessageWithoutKnownLength<TMessage, Partial<TMessage>>
{
    constructor(start: ParserWithMessage<any, TMessage>, parser: ParserWithMessageWithoutKnownLength<any, TMessage>, end: ParserWithMessage<any, TMessage>)
    {
        super(start, parser, end);
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): TMessage
    {
        const newCursor = new Cursor();
        this.parsers[0].read(buffer, cursor, message);
        this.parsers[1].read(buffer.subarray(cursor.offset, buffer.length - this.parsers[2].length), newCursor, message);
        cursor.offset += newCursor.offset;
        this.parsers[2].read(buffer, cursor, message);

        return message;
    }
    write(buffer: IsomorphicBuffer | TMessage, cursor: Cursor | Partial<TMessage>, value?: TMessage, message?: Partial<TMessage>)
    {
        return super.write(buffer, cursor, value, message);
    }

}
