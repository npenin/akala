import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import * as parsers from '../index.js';
import { TLVBuffer } from './buffer.js';
import { TLVNumber } from './number.js';
import TLVObject, { Map, MapByName } from './object.js';
import { TLVString } from './string.js';

export default function tlv(parser: parsers.Parsers<number>, maxLength: number, encoding?: BufferEncoding)
{
    const buffer = new TLVBuffer(parser, maxLength);
    const stringWithEncodings = {};
    return {
        buffer: buffer,
        string: stringWithEncodings[encoding] = new TLVString(parser, maxLength, encoding),
        stringWithEncoding: (otherEncoding: BufferEncoding) => stringWithEncodings[otherEncoding] || (stringWithEncodings[otherEncoding] = new TLVString(parser, maxLength, otherEncoding)),
        number: new TLVNumber(parser),
        object<TMessage extends { [key: string]: number | string | IsomorphicBuffer }>(map: Map<TMessage>) { return new TLVObject(buffer, parser, map) },
        objectByName<TMessage extends { [key: string]: number | string | IsomorphicBuffer }>(map: MapByName<TMessage>) { return new TLVObject(buffer, parser, Object.fromEntries(Object.entries(map).map(e => [e[1].index, { name: e[0], parser: e[1].parser }]))) },
    }
}

