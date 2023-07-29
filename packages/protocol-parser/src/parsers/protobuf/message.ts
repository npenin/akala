import Uint32 from "../uint32.js";
import Uint64 from "../uint64.js";
import { Cursor, parserWrite, ParserWithoutKnownLength, ParserWithMessageWithoutKnownLength, AnyParser } from "../_common.js";
import { Field, WireType } from './field.js';

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

export default class Message<TMessage> implements ParserWithMessageWithoutKnownLength<TMessage, Partial<TMessage>>
{
    private parsers: (ParserWithMessageWithoutKnownLength<any, Partial<TMessage>> & { wireType: WireType })[];

    public readonly wireType: 'length-delimited';

    constructor(...parsers: (ParserWithMessageWithoutKnownLength<any, Partial<TMessage>> & { wireType: WireType })[])
    {
        this.parsers = parsers;
    }

    length: -1 = -1;

    public read(buffer: Buffer, cursor: Cursor, message?: Partial<TMessage>): TMessage
    {
        if (typeof (message) == 'undefined')
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

    public write(value: TMessage): Buffer[]
    {
        var result: Buffer[] = [];
        for (let fieldId = 0; fieldId < this.parsers.length; fieldId++)
        {

            const fieldParser = this.parsers[fieldId];
            var valueBuffers = parserWrite(fieldParser, value, value);
            if (valueBuffers !== null)
            {
                var fieldDefinition = Buffer.alloc(1);
                result.push(fieldDefinition);
                field.write(fieldDefinition, new Cursor(), { fieldId: fieldId + 1, type: fieldParser.wireType });
                result.push(...valueBuffers);
            }
            // let buffer: Buffer;
            // if (typeof (value) !== 'undefined')
            // {
            //     switch (fieldParser.wireType)
            //     {
            //         case 'varint':
            //             result.push(...varint.write(value[field.name] as any));
            //             break;
            //         case '64-bit':
            //             buffer = Buffer.alloc(8);
            //             Uint64LE.prototype.write(buffer, new Cursor(), value[field.name] as any);
            //             break;
            //         case 'length-delimited':
            //             if (!Buffer.isBuffer(value[field.name]))
            //                 prefixedBuffer.write(Buffer.from(value[field.name] as any));
            //             else
            //                 prefixedBuffer.write(value[field.name] as any);
            //             break;
            //         case '32-bit':
            //             buffer = Buffer.alloc(4);
            //             Uint64LE.prototype.write(buffer, new Cursor(), value[field.name] as any);
            //             break;
            //     }
            // }
        }
        return result;
    }
}


export class UnknownMessage implements ParserWithMessageWithoutKnownLength<Record<number, unknown | unknown[]>, Record<number, unknown | unknown[]>>
{
    public readonly wireType: 'length-delimited';

    constructor(private varint: ParserWithoutKnownLength<number>, private raw: AnyParser<unknown, Record<number, unknown | unknown[]>>, private bit32: Uint32, private bit64: Uint64)
    {
    }

    length: -1 = -1;

    public read(buffer: Buffer, cursor: Cursor, message?: Record<number, unknown | unknown[]>): Record<number, unknown | unknown[]>
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
                    break;
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

    public write(value: Record<number, unknown | unknown[]>): Buffer[]
    {
        var result: Buffer[] = [];
        // for (let fieldId = 0; fieldId < this.parsers.length; fieldId++)
        // {

        //     const fieldParser = this.parsers[fieldId];
        //     var valueBuffers = parserWrite(fieldParser, value, value);
        //     if (valueBuffers !== null)
        //     {
        //         var fieldDefinition = Buffer.alloc(1);
        //         result.push(fieldDefinition);
        //         field.write(fieldDefinition, new Cursor(), { fieldId: fieldId + 1, type: fieldParser.wireType });
        //         result.push(...valueBuffers);
        //     }
        //     // let buffer: Buffer;
        //     // if (typeof (value) !== 'undefined')
        //     // {
        //     //     switch (fieldParser.wireType)
        //     //     {
        //     //         case 'varint':
        //     //             result.push(...varint.write(value[field.name] as any));
        //     //             break;
        //     //         case '64-bit':
        //     //             buffer = Buffer.alloc(8);
        //     //             Uint64LE.prototype.write(buffer, new Cursor(), value[field.name] as any);
        //     //             break;
        //     //         case 'length-delimited':
        //     //             if (!Buffer.isBuffer(value[field.name]))
        //     //                 prefixedBuffer.write(Buffer.from(value[field.name] as any));
        //     //             else
        //     //                 prefixedBuffer.write(value[field.name] as any);
        //     //             break;
        //     //         case '32-bit':
        //     //             buffer = Buffer.alloc(4);
        //     //             Uint64LE.prototype.write(buffer, new Cursor(), value[field.name] as any);
        //     //             break;
        //     //     }
        //     // }
        // }
        return result;
    }
}