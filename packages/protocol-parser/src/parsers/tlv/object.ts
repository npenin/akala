import { uint8 } from "../index.js";
import { AnyParser, Cursor, Parsers, ParserWithMessage, ParserWithMessageWithoutKnownLength, ParserWithoutKnownLength, parserWrite } from "../_common.js";
import { TLVBuffer } from './buffer.js';

export type Map<TMessage> = Record<number, { name: keyof TMessage, parser: AnyParser<TMessage[keyof TMessage], Partial<TMessage>> }>
export type MapByName<TMessage> = Record<keyof TMessage, { index: number, parser: AnyParser<TMessage[keyof TMessage], Partial<TMessage>> }>

export default class TLVObject<TMessage extends object> implements ParserWithoutKnownLength<TMessage>
{
    mapByName: MapByName<TMessage>;

    constructor(private readonly defaultParser: AnyParser<unknown, Partial<TMessage>>, private readonly number: Parsers<number>, private map?: Map<TMessage>)
    {
        if (map)
            this.mapByName = Object.fromEntries(Object.entries(map).map(e => [e[1].name, { index: e[0] as unknown as number, parser: e[1].parser }])) as MapByName<TMessage>;
    }

    length: -1 = -1;
    read(buffer: Buffer, cursor: Cursor): TMessage
    {
        const message: Partial<TMessage> = {};
        while (cursor.offset < buffer.byteLength)
        {
            const key = uint8.read(buffer, cursor);
            if (this.map && this.map[key])
                message[this.map[key].name] = this.map[key].parser.read(buffer, cursor, message);
            else
                message[key] = this.defaultParser.read(buffer, cursor, message);
        }
        return message as TMessage;
    }
    write(value: TMessage): Buffer[]
    {
        return (Object.entries(value) as [keyof TMessage, TMessage[keyof TMessage]][]).map(e =>
        {
            if (this.mapByName && this.mapByName[e[0]])
                return parserWrite(this.number, this.mapByName[e[0]].index).concat(parserWrite(this.mapByName[e[0]].parser, e[1], value) as Buffer[]);
        }).filter(e => e).flat()
    }
}