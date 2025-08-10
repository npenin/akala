import { uint8 } from "../index.js";
import { type AnyParser, Cursor, type Parsers, type Parser } from "../_common.js";
import { IsomorphicBuffer } from "@akala/core";

export type Map<TMessage> = Record<number, { name: keyof TMessage, parser: AnyParser<TMessage[keyof TMessage], Partial<TMessage>> }>
export type MapByName<TMessage> = Record<keyof TMessage, { index: number, parser: AnyParser<TMessage[keyof TMessage], Partial<TMessage>> }>

export default class TLVObject<TMessage extends object> implements Parser<TMessage>
{
    mapByName: MapByName<TMessage>;

    constructor(private readonly defaultParser: AnyParser<unknown, Partial<TMessage>>, private readonly number: Parsers<number>, private map?: Map<TMessage>)
    {
        if (map)
            this.mapByName = Object.fromEntries(Object.entries(map).map(e => [e[1].name, { index: e[0] as unknown as number, parser: e[1].parser }])) as MapByName<TMessage>;
    }
    getLength(value: TMessage): number
    {
        return (Object.entries(value) as [keyof TMessage, TMessage[keyof TMessage]][]).reduce((previous, e) =>
        {
            if (this.mapByName && this.mapByName[e[0]])
                return previous + this.number.getLength(this.mapByName[e[0]].index) + this.mapByName[e[0]].parser.getLength(e[1], value);
        }, 0)
    }

    length: -1 = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor): TMessage
    {
        const message: Partial<TMessage> = {};
        while (cursor.offset < buffer.length)
        {
            const key = uint8.read(buffer, cursor);
            if (this.map && this.map[key])
                message[this.map[key].name] = this.map[key].parser.read(buffer, cursor, message);
            else
                message[key] = this.defaultParser.read(buffer, cursor, message);
        }
        return message as TMessage;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: TMessage): void
    {
        (Object.entries(value) as [keyof TMessage, TMessage[keyof TMessage]][]).forEach(e =>
        {
            if (this.mapByName && this.mapByName[e[0]])
            {
                this.number.write(buffer, cursor, this.mapByName[e[0]].index);
                this.mapByName[e[0]].parser.write(buffer, cursor, e[1], value);
            }
        })
    }
}
