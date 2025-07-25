import Uint32 from "../uint32.js";
import Uint64 from "../uint64.js";
import { Cursor, ParserWithMessage, AnyParser, Parser } from "../_common.js";
import { Field, WireType } from './field.js';
import { IsomorphicBuffer } from "@akala/core";

// const varint = new Varint();
// const prefixedBuffer = new PrefixedBuffer(varint);

export interface MessageModel<T>
{
    fields: FieldModel<T, keyof T>[];
}


export interface FieldModel<T, TKey extends keyof T>
{
    name: TKey;
    wireType: WireType;
}

// type ProtobufParser<TMessage, T = any> = ParserWithMessage<T, TMessage> & { wireType: WireType };

const field = new Field();

export default class Message<TMessage> implements ParserWithMessage<TMessage, Partial<TMessage>>
{
    private parsers: (ParserWithMessage<any, Partial<TMessage>> & { wireType: WireType })[];

    public readonly wireType: 'length-delimited';

    constructor(...parsers: (ParserWithMessage<any, Partial<TMessage>> & { wireType: WireType })[])
    {
        this.parsers = parsers;
    }
    getLength(value: TMessage, message?: Partial<TMessage>): number
    {
        return this.parsers.reduce((previous, current, fieldId) =>
        {

            const length = current.getLength(value, value);

            if (length > 0)
                return length + field.getLength({ fieldId: fieldId + 1, type: current.wireType });
            else
                return 0
        }, 0)
    }

    length: -1 = -1;

    public read(buffer: IsomorphicBuffer, cursor: Cursor, message?: Partial<TMessage>): TMessage
    {
        message = {} as Partial<TMessage>;
        while (cursor.offset < buffer.length)
        {
            var parsedField = field.read(buffer, cursor);
            var property = this.parsers[parsedField.fieldId - 1];
            // cursor.offset = offset;

            if (property.wireType !== parsedField.type)
                throw new Error(`wire type in model does not match with the wire type received for field ${parsedField.fieldId} (expectedType=${property.wireType}, actualType=${parsedField.type})`);

            property.read(buffer, cursor, message);
        }
        return message as TMessage;
        // switch (parsedField.type)
        // {
        //     case 'varint':
        //         message[property.name] = varint.read(buffer, cursor) as any;
        //         break;
        //     case '64-bit':
        //         message[property.name] = Uint64LE.prototype.read(buffer, cursor) as any;
        //         break;
        //     case 'length-delimited':
        //         message[property.name] = prefixedBuffer.read(buffer, cursor) as any;
        //         break;
        //     case '32-bit':
        //         message[property.name] = buffer.readFloatLE(cursor.offset) as any;
        //         cursor.offset += 4;
        //         break;
        // }
        // return message;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: TMessage): void
    {
        for (let fieldId = 0; fieldId < this.parsers.length; fieldId++)
        {
            const fieldParser = this.parsers[fieldId];
            const initialOffset = cursor.offset;
            cursor.offset++;
            fieldParser.write(buffer, cursor, value, value);

            if (cursor.offset > initialOffset + 1)
            {
                const finalOffset = cursor.offset;
                cursor.offset = initialOffset;
                field.write(buffer, cursor, { fieldId: fieldId + 1, type: fieldParser.wireType });
                cursor.offset = finalOffset;
            }
            else
                cursor.offset--;
        }
    }
}


export class UnknownMessage implements ParserWithMessage<Record<number, unknown | unknown[]>, Record<number, unknown | unknown[]>>
{
    public readonly wireType: 'length-delimited';

    constructor(private varint: Parser<number>, private raw: AnyParser<unknown, Record<number, unknown | unknown[]>>, private bit32: Uint32, private bit64: Uint64)
    {
    }

    length: -1 = -1;

    getLength(value: Record<number, unknown>, message?: Record<number, unknown>): number
    {
        return -1;
    }

    public read(buffer: IsomorphicBuffer, cursor: Cursor, message?: Record<number, unknown | unknown[]>): Record<number, unknown | unknown[]>
    {
        if (typeof (message) == 'undefined')
            message = {};
        while (cursor.offset < buffer.length)
        {
            var parsedField = field.read(buffer, cursor);
            var value;
            switch (parsedField.type)
            {
                case '32-bit':
                    value = this.bit32.read(buffer, cursor);
                    break;
                case '64-bit':
                    value = this.bit64.read(buffer, cursor);
                    break;
                case 'end-group':
                case 'start-group':
                case 'length-delimited':
                    value = this.raw.read(buffer, cursor, message)
                    break;
                case 'varint':
                    value = this.varint.read(buffer, cursor);
                    break;
                default:
                    var x: never = parsedField.type;
                    throw new Error('invalid type ' + x)
            }
            if (Array.isArray(message[parsedField.fieldId]))
                (message[parsedField.fieldId] as unknown[]).push(value);
            else if (typeof message[parsedField.fieldId] != 'undefined')
                message[parsedField.fieldId] = [message[parsedField.fieldId], value];
            else
                message[parsedField.fieldId] = value;
        }
        return message;
    }

    public write(buffer: IsomorphicBuffer, cursor: Cursor, value: Record<number, unknown | unknown[]>): void
    {

    }
}
