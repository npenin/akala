import Bit from './bit.js'
import Boolean from './boolean.js'
import Uint2 from './uint2.js'
import Uint3 from './uint3.js'
import Uint4 from './uint4.js'
import Uint5 from './uint5.js'
import Uint6 from './uint6.js'
import Uint7 from './uint7.js'
import Uint8 from './uint8.js'
import Int2 from './int2.js'
import Int3 from './int3.js'
import Int4 from './int4.js'
import Int5 from './int5.js'
import Int6 from './int6.js'
import Int7 from './int7.js'
import Int8 from './int8.js'
import Uint16 from './uint16.js'
import Uint24 from './uint24.js'
import Uint32 from './uint32.js'
import Uint64 from './uint64.js'
import Uint16LE from './uint16LE.js'
import Uint24LE from './uint24LE.js'
import Uint32LE from './uint32LE.js'
import Uint64LE from './uint64LE.js'
import Vuint from './vuint.js'
import VuintLE from './vuintLE.js'
import Int16 from './int16.js'
import Int24 from './int24.js'
import Int32 from './int32.js'
import Int64 from './int64.js'
import Int16LE from './int16LE.js'
import Int24LE from './int24LE.js'
import Int32LE from './int32LE.js'
import Int64LE from './int64LE.js'
import Float from './float.js'
import FloatLE from './floatLE.js'
import Double from './double.js'
import DoubleLE from './doubleLE.js'

import PrefixedString from './string-prefixed.js'
import FixedString from './string-fixed.js'
import PreparsedLengthString from './string-preparsed.js'
import PrefixedArray from './array-prefixed.js'
import FixedArray from './array-fixed.js'
import PreparsedLengthArray from './array-preparsed.js'
import { Cursor } from './_common.js'
import type { AnyParser, Parser, Parsers, ParsersWithMessage, ParserWithMessage } from './_common.js'
import Skip, { SkipParser } from './skip.js'
import PrefixedBuffer from './buffer-prefixed.js'
import BufferRaw from './buffer-fixed.js'
import Object from './object.js'
import Switch from './switch.js'
import SwitchProperty from './property-switch.js'
import Sequence from './sequence.js'
import Series from './series.js'
import PrefixedLengthSeries from './series-prefixed.js'
import Property from './property.js'
import PropertyObject from './property-object.js'
import { Prepare } from './prepare.js'
import { ZeroOrOne } from './zero-or-one.js'
import Between from './between.js'
import * as protobuf from './protobuf/index.js'
import { Sub } from './sub.js'
import { Conditional } from './conditional-parser.js'
import * as types from '../core.js'
import { Ignore } from './ignore-message.js'
import PreparsedLengthBuffer from './buffer-preparsed.js'
import { IsomorphicBuffer, type BufferEncoding } from '@akala/core'
import SignedLEB128 from './LEB128.signed.js'
import UnsignedLEB128 from './LEB128.unsigned.js'
import Cache from './cache.js'
import ConstantString from './string-constant.js'
import FixedStringOrNull from './string-fixed-or-null.js'

export { protobuf };

export const bit: Parser<number> = new Bit();
export const uint2: Parser<number> = new Uint2();
export const uint3: Parser<number> = new Uint3();
export const uint4: Parser<number> = new Uint4();
export const uint5: Parser<number> = new Uint5();
export const uint6: Parser<number> = new Uint6();
export const uint7: Parser<number> = new Uint7();
export const uint8: Parser<number> = new Uint8();
export const int2: Parser<number> = new Int2();
export const int3: Parser<number> = new Int3();
export const int4: Parser<number> = new Int4();
export const int5: Parser<number> = new Int5();
export const int6: Parser<number> = new Int6();
export const int7: Parser<number> = new Int7();
export const int8: Parser<number> = new Int8();
export const uint16: Parser<number> = new Uint16();
export const uint24: Parser<number> = new Uint24();
export const uint32: Parser<number> = new Uint32();
export const uint64: Parser<bigint> = new Uint64();
export const uint16LE: Parser<number> = new Uint16LE();
export const uint24LE: Parser<number> = new Uint24LE();
export const uint32LE: Parser<number> = new Uint32LE();
export const uint64LE: Parser<bigint> = new Uint64LE();
export const int16: Parser<number> = new Int16();
export const int24: Parser<number> = new Int24();
export const int32: Parser<number> = new Int32();
export const int64: Parser<bigint> = new Int64();
export const int16LE: Parser<number> = new Int16LE();
export const int24LE: Parser<number> = new Int24LE();
export const int32LE: Parser<number> = new Int32LE();
export const int64LE: Parser<bigint> = new Int64LE();
export const vuint: Parser<number> = new Vuint();
export const vuintLE: Parser<number> = new VuintLE();
export const signedLEB128: Parser<number> = new SignedLEB128();
export const unsignedLEB128: Parser<number> = new UnsignedLEB128();

export const floatLE: Parser<types.float> = new FloatLE();
export const float: Parser<types.float> = new Float();
export const double: Parser<types.double> = new Double();
export const doubleLE: Parser<types.double> = new DoubleLE();

export type { Parser, ParserWithMessage, Parsers, ParsersWithMessage, AnyParser };

export
{
    Bit,
    Uint2,
    Uint3,
    Uint4,
    Uint5,
    Uint6,
    Uint7,
    Uint8,
    Uint16,
    Uint24,
    Uint32,
    Uint64,
    Uint16LE,
    Uint24LE,
    Uint32LE,
    Uint64LE,
    Int16,
    Int24,
    Int32,
    Int64,
    Int16LE,
    Int24LE,
    Int32LE,
    Int64LE,
    Vuint,
    VuintLE,
    PrefixedString as String,
    FixedString,
    PrefixedArray as Array,
    FixedArray,
    Sequence,
    Series,
    Between,
    Float,
    FloatLE,
    Double,
    DoubleLE,
    PrefixedBuffer,
    BufferRaw as FixedBuffer,
    SignedLEB128,
    UnsignedLEB128,
    Cache,
    FixedStringOrNull,
    PrefixedLengthSeries,
    PreparsedLengthArray,
    PreparsedLengthBuffer,
    PreparsedLengthString,
};

export function skip<TMessage>(length: number | AnyParser<number, TMessage>): ParsersWithMessage<never, TMessage>
{
    if (typeof length == 'number')
        return new Skip(length);
    return new SkipParser<TMessage>(length);
}
export function sub<TResult, TMessage>(length: AnyParser<number, TMessage>, inner: AnyParser<TResult, TMessage>): ParserWithMessage<TResult, TMessage>
{
    return new Sub(length, inner);
}
export function boolean(parser?: Parser<number>): Parser<boolean>
{
    return new Boolean(parser || bit);
}
export function cache<T extends number | string | symbol>(parser: Parser<T>): Parser<T>
export function cache<T extends number | string | symbol, TMessage>(parser: ParserWithMessage<T, TMessage>): ParserWithMessage<T, TMessage>
export function cache<T extends number | string | symbol, TMessage>(parser: AnyParser<T, TMessage>): AnyParser<T, TMessage>
{
    return new Cache(parser);
}

export function constant<TValue extends string>(value: TValue, encoding?: BufferEncoding): Parser<TValue>
{
    return new ConstantString(value, encoding);
}

export function string<TString extends string = string>(length: number, encoding?: BufferEncoding): Parser<TString>
export function string<TString extends string = string>(length: Parsers<number>, encoding?: BufferEncoding): Parser<TString>
export function string<T, TString extends string = string>(length: keyof T, encoding?: BufferEncoding): ParserWithMessage<TString, T>
export function string<T, TString extends string = string>(length: Parsers<number> | number | keyof T, encoding?: BufferEncoding): AnyParser<TString, T>
{
    if (typeof (length) === 'number')
        return new FixedString<TString>(length, encoding);
    if (typeof (length) === 'string' || typeof (length) === 'symbol')
        return new PreparsedLengthString<T, typeof length, TString>(length, encoding);
    return new PrefixedString<TString>(length as Parsers<number>, encoding);
}
export function buffer<T = unknown>(length: Parser<number> | Parser<number> | number | keyof T, dismissMainBuffer?: boolean): AnyParser<IsomorphicBuffer, T>
{
    if (typeof length == 'number')
        return new BufferRaw(length, dismissMainBuffer);
    if (typeof (length) === 'string' || typeof (length) === 'symbol')
        return new PreparsedLengthBuffer<T, typeof length>(length, dismissMainBuffer);
    return new PrefixedBuffer(length, dismissMainBuffer);
}
export function array<T, TMessage>(length: Parser<number> | ParserWithMessage<number, TMessage>, value: AnyParser<T, TMessage>): TMessage extends Cursor ? Parser<T[]> : ParserWithMessage<T[], TMessage>
export function array<T, TMessage>(length: Parser<number> | ParserWithMessage<number, TMessage>, value: AnyParser<T, TMessage>): Parser<T[]>
export function array<T, TMessage>(length: -1, value: Parser<T>): Parser<T[]>
export function array<T, TMessage>(length: -1, value: ParserWithMessage<T, unknown>): ParserWithMessage<T[], TMessage>
export function array<T, TMessage>(length: -1, value: ParserWithMessage<T, unknown>): ParserWithMessage<T[], TMessage>
export function array<T, TMessage>(length: number, value: Parser<T>): Parser<T[]>
export function array<T, TMessage>(length: keyof TMessage, value: AnyParser<T, Partial<T>>): ParserWithMessage<T[], TMessage>
export function array<T, TMessage>(length: keyof TMessage | number | AnyParser<number, TMessage>, value: AnyParser<T, TMessage>): AnyParser<T[], TMessage>
{
    if (typeof (length) === 'number')
        return new FixedArray<T, TMessage>(length, value);
    if (typeof (length) === 'string' || typeof length === 'symbol')
        return new PreparsedLengthArray<T, TMessage>(length, value);
    return new PrefixedArray<T, TMessage>(length as Parser<number>, value);
}

export function object<T extends object>(...maps: AnyParser<T[keyof T] | T, T>[]): ParserWithMessage<T, Partial<T>>
{
    var mapTriaged: AnyParser<T[keyof T], T>[][] = [];
    var lastKnowsLength: boolean;
    maps.forEach((parser) =>
    {
        if (typeof (lastKnowsLength) == 'undefined' || lastKnowsLength !== (parser.length !== -1))
        {
            mapTriaged.push([]);
            lastKnowsLength = parser.length !== -1;
        }

        mapTriaged[mapTriaged.length - 1].push(parser as any);
    });

    if (mapTriaged.length == 1)
        return new Object<T>(...maps);
    return new Object<T>(...mapTriaged.map(map => new Series(...map)));
}

function seriesOrSingle<T>(map: AnyParser<T[keyof T], T>[])
{
    if (map.length == 1)
        return map[0];
    const result = new Series(...map);
    if (result.length !== -1)
        return cache(result);
    return result;
}

export function series<T extends object>(...maps: AnyParser<T[keyof T], T>[]): ParserWithMessage<T, Partial<T>>
{
    var mapTriaged: AnyParser<T[keyof T], T>[][] = [];
    var lastKnowsLength: boolean;
    maps.forEach((parser) =>
    {
        if (typeof (lastKnowsLength) == 'undefined' || lastKnowsLength !== (parser.length !== -1))
        {
            mapTriaged.push([]);
            lastKnowsLength = parser.length !== -1;
        }

        mapTriaged[mapTriaged.length - 1].push(parser);
    });

    if (mapTriaged.length == 1 && maps.length == 1)
        return maps[0] as any;
    if (mapTriaged.length == 1)
        return seriesOrSingle(mapTriaged[0]);
    if (mapTriaged.length == 3 && mapTriaged[0][0].length > -1 && mapTriaged[1][0].length == -1 && mapTriaged[2][0].length > -1)
        return new Between<T, Partial<T>>(seriesOrSingle(mapTriaged[0]), seriesOrSingle(mapTriaged[1]), seriesOrSingle(mapTriaged[2]));
    return new Series(...mapTriaged.map(map => seriesOrSingle(map)));
}

export function prefixedSeries<T extends object>(length: Parsers<number>, ...maps: AnyParser<T[keyof T] | T, T>[]): ParserWithMessage<T, Partial<T>>
{
    return new PrefixedLengthSeries(length, series<T>(...maps as any));
}
export const noop: Parser<void> = {
    length: 0,
    getLength(value)
    {
        return 0;
    },
    read(buffer, cursor)
    {
    },
    write(buffer, cursor, value)
    {
    },
}

export function choose<T, const TValue extends PropertyKey, TResult>(name: keyof T | ((x: T) => TValue), parsers: {
    [key in TValue]: AnyParser<TResult, T>;
}): Switch<T, TResult, TValue>
{
    return new Switch<T, TResult, TValue>(name, parsers);
}

export function chooseProperty<T, const TKey extends keyof T = keyof T, const TKeyAssign extends keyof T = keyof T, TResult extends T[TKeyAssign] = T[TKeyAssign], TValue extends (T[TKey] extends string | number | symbol ? T[TKey] : never) = (T[TKey] extends string | number | symbol ? T[TKey] : never)>(name: TKey, assignProperty: TKeyAssign, parsers: { [key in TValue]: AnyParser<TResult, T[TKeyAssign]> })
// : ParserWithMessage<TResult, T>
{
    return new SwitchProperty<T, TKey, TKeyAssign, TResult, TValue>(name, assignProperty, parsers);
}

export function optional<T, TMessage>(parser: AnyParser<T, TMessage>)
{
    return new ZeroOrOne<T, TMessage>(parser);
}

export function condition<T, TMessage>(condition: (message: TMessage) => boolean, parser: AnyParser<T, TMessage>): ParserWithMessage<T, TMessage>
{
    return new Conditional<T, TMessage>(condition, parser);
}

// export function property<T, const TKey extends keyof T>(name: TKey, valueParser: Parser<T[TKey]>): AnyParser<T[TKey], T>
// export function property<T, const TKey extends keyof T>(name: TKey, valueParser: Parser<T[TKey]>): AnyParser<T[TKey], T>
// export function property<T, const TKey extends keyof T>(name: TKey, valueParser: ParserWithMessage<T[TKey], T>): AnyParser<T[TKey], T>
// export function property<T, const TKey extends keyof T>(name: TKey, valueParser: ParserWithMessage<T[TKey], T>): AnyParser<T[TKey], T>
// export function property<T, const TKey extends keyof T>(name: TKey, valueParser: AnyParser<T[TKey], T>): AnyParser<T[TKey], T>
export function property<T, const TKey extends keyof T, X extends AnyParser<T[TKey], T>>(name: TKey, valueParser: X): AnyParser<T[TKey], T>
{
    return new Property<T, TKey>(name, valueParser);
}
export function complexProperty<T extends object, const TKey extends keyof T>(name: TKey, valueParser: AnyParser<T[TKey], T[TKey]>): ParserWithMessage<T[TKey], T>
{
    return new PropertyObject<T, TKey>(name, valueParser);
}

export function prepare<T, TMessage>(fn: (t: T) => void, parser: AnyParser<T, TMessage>)
{
    return new Prepare<T, TMessage>(fn, parser);
}

export function emancipate<T, TMessage>(parser: AnyParser<T, any>): AnyParser<T, TMessage>
{
    return new Ignore(parser);
}
