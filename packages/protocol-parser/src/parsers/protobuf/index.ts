import PrefixedBuffer from "../buffer-prefixed.js";
import ProtobufString from './string.js';
import FixedLengthArray from "../array-fixed.js";
import Uint32 from "../uint32.js";
import Uint64 from "../uint64.js";
import type { AnyParser, ParsersWithMessage, ParserWithMessage } from "../_common.js";
import Property, { type ArrayItem } from './property.js';
import { type WireType } from './field.js';
import Message, { UnknownMessage } from './message.js';
import { Sub } from './sub.js';
import Varint from './varint.js';
import { ZeroOrOne } from "../zero-or-one.js";
import { type BufferEncoding } from "@akala/core";
export { type WireType };

export const varint = new Varint();
export const raw: PrefixedBuffer & { wireType: WireType } = Object.assign(new PrefixedBuffer(varint), { wireType: 'length-delimited' } as { wireType: 'length-delimited' });
export const int32: Uint32 & { wireType: WireType } = Object.assign(new Uint32(), { wireType: '32-bit' } as { wireType: WireType });
export const int64: Uint64 & { wireType: WireType } = Object.assign(new Uint64(), { wireType: '64-bit' } as { wireType: WireType });
export { Message, Sub, Varint }

export type ProtobufMessageProperty<T, TKey extends keyof T> = ArrayItem<T[TKey]> | ArrayItem<T[TKey]>[];
export type ProtobufMessage<T> = { [key in keyof T]?: ProtobufMessageProperty<T, key> };
export type ProtobufMessage2<T> = T extends ProtobufMessage<T> ? T : ProtobufMessage<T>;

export function packed<T extends ProtobufMessage<T>>(name: keyof T, parser: AnyParser<T[typeof name], Partial<T>>)
{
    return property<T, typeof name>(name, 'length-delimited', new Sub<T[typeof name], Partial<T>>(varint, new FixedLengthArray(-1, parser) as any));
}

export function sub<T extends ProtobufMessage<T>>(parser: AnyParser<T, Partial<T>>)
    : ParserWithMessage<T, any> & { wireType: WireType }
{
    return new Sub(varint, parser);
}

/**
 * Ensures the first 4 bytes are an int32 informing about the message length
 * @param parser 
 * @returns 
 */
export function root<T extends ProtobufMessage<T>>(parser: AnyParser<T, Partial<T>>)
    : ParserWithMessage<T, any> & { wireType: WireType }
{
    return new Sub(int32, parser);
}

export function property<T extends ProtobufMessage<T>, TKey extends keyof T>(name: TKey, wireType: WireType, parser: AnyParser<T[TKey], T>)
    : ParserWithMessage<T[TKey], T> & { wireType: WireType }
export function property<T extends ProtobufMessage<T>, TKey extends keyof T>(name: TKey, parser: (ParsersWithMessage<T[TKey], Partial<T>> & { wireType: WireType }))
    : ParserWithMessage<T[TKey], T> & { wireType: WireType }
export function property<T extends ProtobufMessage<T>, TKey extends keyof T>(name: TKey, wireType: WireType | (ParsersWithMessage<any, Partial<T>> & { wireType: WireType }), parser?: AnyParser<T[TKey], Partial<T>>)
    : ParserWithMessage<T[TKey], T> & { wireType: WireType }
{
    if (typeof wireType !== 'string')
    {
        parser = wireType;
        wireType = wireType.wireType;
    }
    return new Property<T, typeof name>(name, wireType, new ZeroOrOne(parser)) as any;
}

export function object<T extends ProtobufMessage<T>>(...parsers: (ParserWithMessage<any, Partial<T>> & { wireType: WireType })[]):
    ParserWithMessage<T, Partial<T> | void> & { wireType: WireType }
{
    return new Message<T>(...parsers);
}

/**
 * This a a shortcut for root(object(parsers))
 * @param parsers 
 * @returns 
 */
export function message<T extends ProtobufMessage<T>>(...parsers: (ParserWithMessage<any, Partial<T>> & { wireType: WireType })[]):
    ParserWithMessage<T, Partial<T> | void> & { wireType: WireType }
{
    return root(object(...parsers));
}
export function string<T>(encoding?: BufferEncoding)
{
    return new ProtobufString(varint, encoding);
}

export const debug = new UnknownMessage(varint, string(), int32, int64);
