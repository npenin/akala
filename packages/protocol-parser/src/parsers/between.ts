import type { ParserWithMessage } from "./index.js";
import Series from './series.js';
import { Cursor } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class Between<T extends TMessage, TMessage> extends Series<T, TMessage> implements ParserWithMessage<T, TMessage>
{
    constructor(start: ParserWithMessage<any, TMessage>, parser: ParserWithMessage<any, TMessage>, end: ParserWithMessage<any, TMessage>)
    {
        super(start, parser, end);
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): T
    {
        const newCursor = new Cursor();
        this.parsers[0].read(buffer, cursor, message);
        this.parsers[1].read(buffer.subarray(cursor.offset, buffer.length - this.parsers[2].length), newCursor, message);
        cursor.offset += newCursor.offset;
        this.parsers[2].read(buffer, cursor, message);

        return message as T;
    }
}
