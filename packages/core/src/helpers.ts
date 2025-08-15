import ErrorWithStatus, { HttpStatusCode } from "./errorWithStatus.js";
import * as base64 from "./base64.js";
import type { Logger } from "./logger.js";
import { EventBus, SpecialEvents } from "./events/event-bus.js";
import { IEvent } from "./events/shared.js";

export type Remote<T> = { [key in keyof T]: T[key] extends (...args) => infer X ? X extends Promise<unknown> ? X : Promise<X> : (T[key] | undefined) }
export type Serializable = string | number | string[] | number[] | boolean | boolean[] | SerializableObject | SerializableObject[];
export type TypedSerializable<T> = T extends Array<infer U> ? TypedSerializable<U>[] : string | number | boolean | TypedSerializableObject<T>;
export type SerializableObject = { [key: string]: Serializable };
export type TypedSerializableObject<T> = { [key in keyof T]: TypedSerializable<T> };

export interface Context<TState = unknown>
{
    state?: TState;
    logger: Logger;
    abort: AbortController;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
export function noop() { }

export function lazy<T>(factory: () => T)
{
    let instance: T;
    return function ()
    {
        return instance || (instance = factory());
    }
}

export function spread<A>(a: A): A
export function spread<A, B>(a: A, b: B): A & B
export function spread<A, B, C>(a: A, b: B, c: C): A & B & C
export function spread<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D
export function spread<A, B, C, D, E>(a: A, b: B, c: C, d: D, e: E): A & B & C & D & E
export function spread(...args: object[]): object
export function spread(...args: object[]): object
{
    const result = {};
    for (let i = 0; i < args.length; i++)
    {
        const element = args[i];
        const descriptors = Object.getOwnPropertyDescriptors(element);
        Object.defineProperties(result, descriptors);
    }

    return result;
}

export interface Translator
{
    locale: string | Intl.Locale;
    translate(key: string): string;
    translate(format: string, ...parameters: unknown[]): string;
    translate(obj: { key: string, fallback: string }): string;
    translate(obj: { key: string, fallback: string }, ...parameters: unknown[]): string;
}


export type BufferEncoding =
    | "ascii"
    | "utf8"
    | "utf-8"
    | "base64"
    | "base64url"
    | "binary"
    | "hex";

export class IsomorphicBuffer implements Iterable<number, number, number>
{
    private readonly buffer: Uint8Array<ArrayBufferLike>
    constructor(buffer: Uint8Array<ArrayBufferLike> | number | number[], private readonly offset?: number, private readonly end?: number)
    {
        if (typeof buffer == 'number')
            this.buffer = new Uint8Array(buffer);
        else if (Array.isArray(buffer))
            this.buffer = new Uint8Array(buffer);
        else
            this.buffer = buffer;
        if (!offset)
            this.offset = 0;
        if (!end)
            this.end = this.buffer.byteLength;
        this.length = this.end - this.offset;
    }

    public readonly length: number;

    public static fromBuffer(buffer: Uint8Array)
    {
        return new IsomorphicBuffer(buffer)
    }

    public static fromArrayBuffer(abuffer: ArrayBufferLike)
    {
        const buffer = new Uint8Array(abuffer.byteLength);
        const view = new DataView(abuffer);
        for (let i = 0; i < abuffer.byteLength; i++)
        {
            buffer[i] = view.getUint8(i);

        }
        return new IsomorphicBuffer(buffer)
    }

    public copy(source: IsomorphicBuffer, offset: number, sourceOffset: number = 0, length?: number)
    {
        if (length === 0 || !length && source.length == 0)
            return;
        offset = this.ensureOffset(offset);
        if (sourceOffset == 0 && (typeof length == 'undefined' || length === source.length))
            this.buffer.set(source.toArray(), offset);
        else
            this.buffer.set(source.subarray(sourceOffset, sourceOffset + length).toArray(), offset);
    }
    toArray(): Uint8Array
    {
        return this.buffer.slice(this.offset, this.end);
    }

    public indexOf(value: number, offset: number = 0)
    {
        return this.buffer.indexOf(value, offset + this.offset) - this.offset;
    }

    public static concat(buffers: IsomorphicBuffer[])
    {
        const totalLength = buffers.reduce((previous, current) => previous + current?.length, 0);
        const target = new IsomorphicBuffer(totalLength);
        let offset = 0;
        for (const buffer of buffers)
        {
            if (!buffer?.length)
                continue;
            target.copy(buffer, offset)
            offset += buffer.length;
        }
        return target;
    }

    public static getInitLength(s: string, encoding: BufferEncoding = 'utf8'): number
    {
        switch (encoding)
        {
            case "ascii":
                return s.length;
            case "utf8":
            case "utf-8":
                return base64.strUTF8ByteLength(s);
            case "base64":
            case "base64url":
                return base64.base64ByteLength(s);
            case "hex":
                return s.length / 2;
            case "binary":
                return s.length;
        }
    }

    public static from(s: string, encoding: BufferEncoding = 'utf8'): IsomorphicBuffer
    {
        switch (encoding)
        {
            case "ascii":
                {
                    const result = new Uint8Array(s.length);
                    for (let i = 0; i < s.length; i++)
                        result[i] = s.charCodeAt(i);
                    return new IsomorphicBuffer(result);
                }
            case "utf8":
            case "utf-8":
                return new IsomorphicBuffer(base64.strToUTF8Arr(s));
            case "base64":
                return new IsomorphicBuffer(base64.base64DecToArr(s));
            case "hex":
                {
                    const result = new Uint8Array(s.length / 2);
                    for (let i = 0; i < s.length; i++)
                        switch (s[i])
                        {
                            case '0':
                                break;
                            case '1':
                                result[i / 2] += i % 2 === 0 ? 0x10 : 0x1;
                                break;
                            case '2':
                                result[i / 2] += i % 2 === 0 ? 0x20 : 0x2;
                                break;
                            case '3':
                                result[i / 2] += i % 2 === 0 ? 0x30 : 0x3;
                                break;
                            case '4':
                                result[i / 2] += i % 2 === 0 ? 0x40 : 0x4;
                                break;
                            case '5':
                                result[i / 2] += i % 2 === 0 ? 0x50 : 0x5;
                                break;
                            case '6':
                                result[i / 2] += i % 2 === 0 ? 0x60 : 0x6;
                                break;
                            case '7':
                                result[i / 2] += i % 2 === 0 ? 0x70 : 0x7;
                                break;
                            case '8':
                                result[i / 2] += i % 2 === 0 ? 0x80 : 0x8;
                                break;
                            case '9':
                                result[i / 2] += i % 2 === 0 ? 0x90 : 0x9;
                                break;
                            case 'A':
                            case 'a':
                                result[i / 2] += i % 2 === 0 ? 0xa0 : 0xa;
                                break;
                            case 'B':
                            case 'b':
                                result[i / 2] += i % 2 === 0 ? 0xB0 : 0xB;
                                break;
                            case 'C':
                            case 'c':
                                result[i / 2] += i % 2 === 0 ? 0xC0 : 0xc;
                                break;
                            case 'D':
                            case 'd':
                                result[i / 2] += i % 2 === 0 ? 0xD0 : 0xD;
                                break;
                            case 'E':
                            case 'e':
                                result[i / 2] += i % 2 === 0 ? 0xE0 : 0xE;
                                break;
                            case 'F':
                            case 'f':
                                result[i / 2] += i % 2 === 0 ? 0xF0 : 0xF;
                                break;
                            default:
                                throw new ErrorWithStatus(HttpStatusCode.BadRequest);
                        }
                    return new IsomorphicBuffer(result)
                }
            case "base64url":
                return new IsomorphicBuffer(base64.base64UrlDecToArr(s));
            case "binary":
                return new IsomorphicBuffer(base64.strToUTF8Arr(s));
        }
    }

    public toString(encoding: BufferEncoding, offset?: number, end?: number): string
    {
        if (offset)
            return this.subarray(offset, end).toString(encoding);

        if (!end)
            end = this.length;

        switch (encoding)
        {
            case "ascii": {
                end += this.offset;
                const result = new Array<string>(end - this.offset);
                for (let i = this.offset; i < end; i++)
                    result[i - this.offset] = String.fromCharCode(this.buffer[i]);
                return result.join('');
            }
            case "utf8":
            case "utf-8":
                return base64.UTF8IsomorphicBufferToStr(this);
            case "base64":
                return base64.base64EncIsomorphicBuffer(this);
            case "hex":
                const result = new Array<string>(this.length);
                for (let i = 0; i < this.length; i++)
                    result[i] = this.buffer[i].toString(16);

                return result.join('');
            case "base64url":
                return base64.base64UrlEncIsomorphicBuffer(this);
            case "binary":
                return base64.UTF8IsomorphicBufferToStr(this);
        }
    }

    public toJSON()
    {
        return {
            type: 'Buffer' as const,
            data: Array.from(this.buffer.subarray(this.offset, this.end))
        };
    }

    public write(s: string, offset: number, length?: number, encoding?: BufferEncoding)
    {
        if (typeof length === 'undefined')
            length = s.length;

        if (length !== s.length)
            return this.write(s.substring(0, length), offset, undefined, encoding);

        this.copy(IsomorphicBuffer.from(s, encoding), offset);
    }

    private ensureOffset(offset?: number, length: number = 1)
    {
        // console.log(`${offset} + ${length} = ${offset + length} <= ${this.end}`)
        if (typeof offset == 'undefined')
            offset = 0;
        offset += this.offset;
        if (offset < this.offset || offset + length > this.end)
            throw new Error('Out of limits')
        return offset;
    }

    public fill(value: number, start?: number, end?: number)
    {
        start = this.ensureOffset(start, end - start);
        end = this.ensureOffset(typeof end === 'undefined' ? this.length : end, 0);
        this.buffer.fill(value, start, end)
    }

    public readInt8(index: number = 0): number
    {
        index = this.ensureOffset(index);
        const val = this.buffer[index];
        return val & 0x80 ? val - 0x100 : val;
    }

    public writeInt8(value: number, index: number = 0)
    {
        index = this.ensureOffset(index);
        this.buffer[index] = value & 0xff;
    }

    public readUInt8(index: number = 0)
    {
        index = this.ensureOffset(index);
        return this.buffer[index];
    }

    public writeUInt8(value: number, index: number = 0)
    {
        index = this.ensureOffset(index);
        this.buffer[index] = value & 0xff;
    }

    public readDoubleBE(index: number = 0): number
    {
        index = this.ensureOffset(index, 8);

        const highWord = (this.buffer[index] << 24) |
            (this.buffer[index + 1] << 16) |
            (this.buffer[index + 2] << 8) |
            this.buffer[index + 3];

        const lowWord = (this.buffer[index + 4] << 24) |
            (this.buffer[index + 5] << 16) |
            (this.buffer[index + 6] << 8) |
            this.buffer[index + 7];

        // Combine into 64-bit value
        const bits = BigInt(highWord) * BigInt(0x100000000) + BigInt(lowWord >>> 0);

        // Handle special cases
        if (bits === BigInt(0)) return 0;

        const sign = ((highWord >>> 31) & 0x1) ? -1 : 1;
        const exponent = ((highWord >>> 20) & 0x7FF) - 1023;
        const fraction = Number((bits & BigInt(0xFFFFFFFFFFFFF)) | BigInt(0x10000000000000));

        return sign * fraction * Math.pow(2, exponent - 52);
    }

    public writeDoubleBE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 8);

        // Handle special cases
        if (value === 0)
        {
            for (let i = 0; i < 8; i++)
            {
                this.buffer[index + i] = 0;
            }
            return;
        }
        if (!Number.isFinite(value))
        {
            if (value === Infinity)
            {
                this.buffer[index] = 0x7F;
                this.buffer[index + 1] = 0xF0;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                this.buffer[index + 4] = 0;
                this.buffer[index + 5] = 0;
                this.buffer[index + 6] = 0;
                this.buffer[index + 7] = 0;
                return;
            }
            if (value === -Infinity)
            {
                this.buffer[index] = 0xFF;
                this.buffer[index + 1] = 0xF0;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                this.buffer[index + 4] = 0;
                this.buffer[index + 5] = 0;
                this.buffer[index + 6] = 0;
                this.buffer[index + 7] = 0;
                return;
            }
            // NaN
            this.buffer[index] = 0x7F;
            this.buffer[index + 1] = 0xF8;
            this.buffer[index + 2] = 0;
            this.buffer[index + 3] = 0;
            this.buffer[index + 4] = 0;
            this.buffer[index + 5] = 0;
            this.buffer[index + 6] = 0;
            this.buffer[index + 7] = 0;
            return;
        }

        const sign = value < 0 ? 1 : 0;
        value = Math.abs(value);

        let exponent = Math.floor(Math.log2(value));
        let fraction = value * Math.pow(2, -exponent) - 1;

        exponent += 1023;
        fraction = Math.round(fraction * 0x10000000000000);

        const low = Number(BigInt.asIntN(32, BigInt(fraction)));
        const high = Number(BigInt.asIntN(32, BigInt(fraction) >> BigInt(32))) | (exponent << 20) | (sign << 31);

        this.buffer[index] = (high >>> 24) & 0xFF;
        this.buffer[index + 1] = (high >>> 16) & 0xFF;
        this.buffer[index + 2] = (high >>> 8) & 0xFF;
        this.buffer[index + 3] = high & 0xFF;
        this.buffer[index + 4] = (low >>> 24) & 0xFF;
        this.buffer[index + 5] = (low >>> 16) & 0xFF;
        this.buffer[index + 6] = (low >>> 8) & 0xFF;
        this.buffer[index + 7] = low & 0xFF;
    }

    public readDoubleLE(index: number = 0): number
    {
        index = this.ensureOffset(index, 8);

        const lowWord = this.buffer[index] |
            (this.buffer[index + 1] << 8) |
            (this.buffer[index + 2] << 16) |
            (this.buffer[index + 3] << 24);

        const highWord = this.buffer[index + 4] |
            (this.buffer[index + 5] << 8) |
            (this.buffer[index + 6] << 16) |
            (this.buffer[index + 7] << 24);

        // Combine into 64-bit value
        const bits = BigInt(highWord) * BigInt(0x100000000) + BigInt(lowWord >>> 0);

        // Handle special cases
        if (bits === BigInt(0)) return 0;

        const sign = ((highWord >>> 31) & 0x1) ? -1 : 1;
        const exponent = ((highWord >>> 20) & 0x7FF) - 1023;
        const fraction = Number((bits & BigInt(0xFFFFFFFFFFFFF)) | BigInt(0x10000000000000));

        return sign * fraction * Math.pow(2, exponent - 52);
    }

    public writeDoubleLE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 8);

        // Handle special cases
        if (value === 0)
        {
            for (let i = 0; i < 8; i++)
            {
                this.buffer[index + i] = 0;
            }
            return;
        }
        if (!Number.isFinite(value))
        {
            if (value === Infinity)
            {
                this.buffer[index] = 0;
                this.buffer[index + 1] = 0;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                this.buffer[index + 4] = 0;
                this.buffer[index + 5] = 0;
                this.buffer[index + 6] = 0xF0;
                this.buffer[index + 7] = 0x7F;
                return;
            }
            if (value === -Infinity)
            {
                this.buffer[index] = 0;
                this.buffer[index + 1] = 0;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                this.buffer[index + 4] = 0;
                this.buffer[index + 5] = 0;
                this.buffer[index + 6] = 0xF0;
                this.buffer[index + 7] = 0xFF;
                return;
            }
            // NaN
            this.buffer[index] = 0;
            this.buffer[index + 1] = 0;
            this.buffer[index + 2] = 0;
            this.buffer[index + 3] = 0;
            this.buffer[index + 4] = 0;
            this.buffer[index + 5] = 0;
            this.buffer[index + 6] = 0xF8;
            this.buffer[index + 7] = 0x7F;
            return;
        }

        const sign = value < 0 ? 1 : 0;
        value = Math.abs(value);

        let exponent = Math.floor(Math.log2(value));
        let fraction = value * Math.pow(2, -exponent) - 1;

        exponent += 1023;
        fraction = Math.round(fraction * 0x10000000000000);

        const low = Number(BigInt.asIntN(32, BigInt(fraction)));
        const high = Number(BigInt.asIntN(32, BigInt(fraction) >> BigInt(32))) | (exponent << 20) | (sign << 31);

        this.buffer[index] = low & 0xFF;
        this.buffer[index + 1] = (low >>> 8) & 0xFF;
        this.buffer[index + 2] = (low >>> 16) & 0xFF;
        this.buffer[index + 3] = (low >>> 24) & 0xFF;
        this.buffer[index + 4] = high & 0xFF;
        this.buffer[index + 5] = (high >>> 8) & 0xFF;
        this.buffer[index + 6] = (high >>> 16) & 0xFF;
        this.buffer[index + 7] = (high >>> 24) & 0xFF;
    }

    public readFloatBE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        const bytes = (this.buffer[index] << 24) |
            (this.buffer[index + 1] << 16) |
            (this.buffer[index + 2] << 8) |
            this.buffer[index + 3];

        // Handle special cases
        if (bytes === 0) return 0;
        if (bytes === 0x7F800000) return Infinity;
        if (bytes === 0xFF800000) return -Infinity;
        if ((bytes & 0x7F800000) === 0x7F800000) return NaN;

        const sign = bytes >>> 31 ? -1 : 1;
        const exponent = ((bytes >>> 23) & 0xFF) - 127;
        const fraction = (bytes & 0x7FFFFF) | 0x800000;

        return sign * fraction * Math.pow(2, exponent - 23);
    }

    public writeFloatBE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);

        // Handle special cases
        if (value === 0)
        {
            this.buffer[index] = 0;
            this.buffer[index + 1] = 0;
            this.buffer[index + 2] = 0;
            this.buffer[index + 3] = 0;
            return;
        }
        if (!Number.isFinite(value))
        {
            if (value === Infinity)
            {
                this.buffer[index] = 0x7F;
                this.buffer[index + 1] = 0x80;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                return;
            }
            if (value === -Infinity)
            {
                this.buffer[index] = 0xFF;
                this.buffer[index + 1] = 0x80;
                this.buffer[index + 2] = 0;
                this.buffer[index + 3] = 0;
                return;
            }
            // NaN
            this.buffer[index] = 0x7F;
            this.buffer[index + 1] = 0xC0;
            this.buffer[index + 2] = 0;
            this.buffer[index + 3] = 0;
            return;
        }

        const sign = value < 0 ? 1 : 0;
        value = Math.abs(value);
        let exponent = Math.floor(Math.log2(value));
        let fraction = value * Math.pow(2, -exponent) - 1;

        exponent += 127;
        fraction = Math.round(fraction * 0x800000);

        const bytes = (sign << 31) | (exponent << 23) | fraction;

        this.buffer[index] = (bytes >>> 24) & 0xFF;
        this.buffer[index + 1] = (bytes >>> 16) & 0xFF;
        this.buffer[index + 2] = (bytes >>> 8) & 0xFF;
        this.buffer[index + 3] = bytes & 0xFF;
    }

    public readFloatLE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        const bytes = this.buffer[index] |
            (this.buffer[index + 1] << 8) |
            (this.buffer[index + 2] << 16) |
            (this.buffer[index + 3] << 24);

        // Handle special cases
        if (bytes === 0) return 0;
        if (bytes === 0x7F800000) return Infinity;
        if (bytes === 0xFF800000) return -Infinity;
        if ((bytes & 0x7F800000) === 0x7F800000) return NaN;

        const sign = bytes >>> 31 ? -1 : 1;
        const exponent = ((bytes >>> 23) & 0xFF) - 127;
        const fraction = (bytes & 0x7FFFFF) | 0x800000;

        return sign * fraction * Math.pow(2, exponent - 23);
    }

    public writeFloatLE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);

        // Handle special cases
        if (value === 0)
        {
            this.buffer[index] = 0;
            this.buffer[index + 1] = 0;
            this.buffer[index + 2] = 0;
            this.buffer[index + 3] = 0;
            return;
        }
        if (!Number.isFinite(value))
        {
            if (value === Infinity)
            {
                this.buffer[index] = 0;
                this.buffer[index + 1] = 0;
                this.buffer[index + 2] = 0x80;
                this.buffer[index + 3] = 0x7F;
                return;
            }
            if (value === -Infinity)
            {
                this.buffer[index] = 0;
                this.buffer[index + 1] = 0;
                this.buffer[index + 2] = 0x80;
                this.buffer[index + 3] = 0xFF;
                return;
            }
            // NaN
            this.buffer[index] = 0;
            this.buffer[index + 1] = 0;
            this.buffer[index + 2] = 0xC0;
            this.buffer[index + 3] = 0x7F;
            return;
        }

        const sign = value < 0 ? 1 : 0;
        value = Math.abs(value);
        let exponent = Math.floor(Math.log2(value));
        let fraction = value * Math.pow(2, -exponent) - 1;

        exponent += 127;
        fraction = Math.round(fraction * 0x800000);

        const bytes = (sign << 31) | (exponent << 23) | fraction;

        this.buffer[index] = bytes & 0xFF;
        this.buffer[index + 1] = (bytes >>> 8) & 0xFF;
        this.buffer[index + 2] = (bytes >>> 16) & 0xFF;
        this.buffer[index + 3] = (bytes >>> 24) & 0xFF;
    }

    public readUInt16LE(index: number = 0): number
    {
        index = this.ensureOffset(index, 2);
        return this.buffer[index] | (this.buffer[index + 1] << 8);
    }

    public writeUInt16LE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 2);
        this.buffer[index] = value & 0xff;
        this.buffer[index + 1] = (value >>> 8) & 0xff;
    }

    public readUInt16BE(index: number = 0): number
    {
        index = this.ensureOffset(index, 2);
        return (this.buffer[index] << 8) | this.buffer[index + 1];
    }

    public writeUInt16BE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 2);
        this.buffer[index] = (value >>> 8) & 0xff;
        this.buffer[index + 1] = value & 0xff;
    }

    public readInt16LE(index: number = 0): number
    {
        index = this.ensureOffset(index, 2);
        const val = this.buffer[index] | (this.buffer[index + 1] << 8);
        return val & 0x8000 ? val - 0x10000 : val;
    }

    public writeInt16LE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 2);
        this.buffer[index] = value & 0xff;
        this.buffer[index + 1] = (value >>> 8) & 0xff;
    }

    public readInt16BE(index: number = 0): number
    {
        index = this.ensureOffset(index, 2);
        const val = (this.buffer[index] << 8) | this.buffer[index + 1];
        return val & 0x8000 ? val - 0x10000 : val;
    }

    public writeInt16BE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 2);
        this.buffer[index] = (value >>> 8) & 0xff;
        this.buffer[index + 1] = value & 0xff;
    }

    public readUInt32LE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        return ((this.buffer[index + 3] << 24) >>> 0) +
            ((this.buffer[index + 2] << 16) |
                (this.buffer[index + 1] << 8) |
                this.buffer[index]);
    }

    public writeUInt32LE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);
        this.buffer[index + 3] = (value >>> 24) & 0xff;
        this.buffer[index + 2] = (value >>> 16) & 0xff;
        this.buffer[index + 1] = (value >>> 8) & 0xff;
        this.buffer[index] = value & 0xff;
    }

    public readUInt32BE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        return ((this.buffer[index] << 24) >>> 0) +
            ((this.buffer[index + 1] << 16) |
                (this.buffer[index + 2] << 8) |
                this.buffer[index + 3]);
    }

    public writeUInt32BE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);
        this.buffer[index] = (value >>> 24) & 0xff;
        this.buffer[index + 1] = (value >>> 16) & 0xff;
        this.buffer[index + 2] = (value >>> 8) & 0xff;
        this.buffer[index + 3] = value & 0xff;
    }

    public readInt32BE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        return (this.buffer[index] << 24) |
            (this.buffer[index + 1] << 16) |
            (this.buffer[index + 2] << 8) |
            this.buffer[index + 3];
    }

    public writeInt32BE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);
        this.buffer[index] = (value >>> 24) & 0xff;
        this.buffer[index + 1] = (value >>> 16) & 0xff;
        this.buffer[index + 2] = (value >>> 8) & 0xff;
        this.buffer[index + 3] = value & 0xff;
    }

    public readInt32LE(index: number = 0): number
    {
        index = this.ensureOffset(index, 4);
        return this.buffer[index] |
            (this.buffer[index + 1] << 8) |
            (this.buffer[index + 2] << 16) |
            (this.buffer[index + 3] << 24);
    }

    public writeInt32LE(value: number, index: number = 0)
    {
        index = this.ensureOffset(index, 4);
        this.buffer[index] = value & 0xff;
        this.buffer[index + 1] = (value >>> 8) & 0xff;
        this.buffer[index + 2] = (value >>> 16) & 0xff;
        this.buffer[index + 3] = (value >>> 24) & 0xff;
    }

    public readBigUInt64LE(index: number = 0): bigint
    {
        index = this.ensureOffset(index, 8);
        const lo = this.readUInt32LE(index);
        const hi = this.readUInt32LE(index + 4);
        return (BigInt(hi) << BigInt(32)) | BigInt(lo);
    }

    public writeBigUInt64LE(value: bigint, index: number = 0)
    {
        index = this.ensureOffset(index, 8);
        const lo = Number(value & BigInt(0xFFFFFFFF));
        const hi = Number(value >> BigInt(32));
        this.writeUInt32LE(lo, index);
        this.writeUInt32LE(hi, index + 4);
    }

    public readBigUInt64BE(index: number = 0): bigint
    {
        index = this.ensureOffset(index, 8);
        const hi = this.readUInt32BE(index);
        const lo = this.readUInt32BE(index + 4);
        return (BigInt(hi) << BigInt(32)) | BigInt(lo);
    }

    public writeBigUInt64BE(value: bigint, index: number = 0)
    {
        index = this.ensureOffset(index, 8);
        const lo = Number(value & BigInt(0xFFFFFFFF));
        const hi = Number(value >> BigInt(32));
        this.writeUInt32BE(hi, index);
        this.writeUInt32BE(lo, index + 4);
    }

    public readBigInt64LE(index: number = 0): bigint
    {
        const val = this.readBigUInt64LE(index);
        return BigInt.asIntN(64, val);
    }

    public writeBigInt64LE(value: bigint, index: number = 0)
    {
        this.writeBigUInt64LE(BigInt.asUintN(64, value), index);
    }

    public readBigInt64BE(index: number = 0): bigint
    {
        const val = this.readBigUInt64BE(index);
        return BigInt.asIntN(64, val);
    }

    public writeBigInt64BE(value: bigint, index: number = 0)
    {
        this.writeBigUInt64BE(BigInt.asUintN(64, value), index);
    }

    public readUIntLE(index: number, byteLength: number): number
    {
        index = this.ensureOffset(index, byteLength);
        let val = this.buffer[index];
        let mul = 1;

        for (let i = 0; i < byteLength - 1; i++)
        {
            mul *= 0x100;
            val += this.buffer[index + i + 1] * mul;
        }

        return val;
    }

    public writeUIntLE(value: number, index: number, byteLength: number): void
    {
        index = this.ensureOffset(index, byteLength);
        let remaining = value;

        for (let i = 0; i < byteLength; i++)
        {
            this.buffer[index + i] = remaining & 0xFF;
            remaining = Math.floor(remaining / 256);
        }
    }

    public readUIntBE(index: number, byteLength: number): number
    {
        index = this.ensureOffset(index, byteLength);
        let val = this.buffer[index + byteLength - 1];
        let mul = 1;

        for (let i = byteLength - 1; i > 0; i--)
        {
            mul *= 0x100;
            val += this.buffer[index + i - 1] * mul;
        }

        return val;
    }

    public writeUIntBE(value: number, index: number, byteLength: number): void
    {
        index = this.ensureOffset(index, byteLength);
        let remaining = value;

        for (let i = byteLength - 1; i >= 0; i--)
        {
            this.buffer[index + i] = remaining & 0xFF;
            remaining = Math.floor(remaining / 256);
        }
    }

    public subarray(start: number, end?: number)
    {
        if (typeof end == 'undefined')
            end = this.end - this.offset;
        if (start == 0 && end == this.end)
            return this;
        if (end < start)
            throw new Error('end is before start');
        if (start < 0 || this.offset + end > this.end)
            throw new Error('Out of limits');
        return new IsomorphicBuffer(this.buffer, this.offset + start, this.offset + end);
    }

    [Symbol.iterator](): Iterator<number, number, number>
    {
        return this.buffer[Symbol.iterator]();
    }

    [Symbol.for('nodejs.util.inspect.custom')](): { type: 'Buffer'; data: number[] }
    {
        return {
            type: 'Buffer',
            data: Array.from(this.buffer.subarray(this.offset, this.end))
        };
    }

    // This is used by util.inspect and assert.deepStrictEqual
    inspect()
    {
        return this[Symbol.for('nodejs.util.inspect.custom')]();
    }

    // This is used by assert.deepStrictEqual for comparison
    [Symbol.for('nodejs.util.inspect.custom.primitive')]()
    {
        return this.toJSON()
    }

    valueOf(): { type: 'Buffer'; data: number[] }
    {
        return this.toJSON()
    }

    equals(other: IsomorphicBuffer): boolean
    {
        if (!(other instanceof IsomorphicBuffer))
        {
            return false;
        }
        if (this.length !== other.length)
        {
            return false;
        }
        for (let i = 0; i < this.length; i++)
        {
            if (this.buffer[this.offset + i] !== other.buffer[other.offset + i])
            {
                return false;
            }
        }
        return true;
    }
}


export interface SocketAdapterEventMap
{
    message: string | IsomorphicBuffer;
    open: Event;
    error: Event;
    close: CloseEvent;
}

export type SocketAdapterAkalaEventMap = { [key in keyof SocketAdapterEventMap]: IEvent<[SocketAdapterEventMap[key]], void> }

export interface SocketAdapter extends EventBus<SocketAdapterAkalaEventMap & Partial<SpecialEvents>>
{
    readonly open: boolean;
    close(): void;
    send(data: string | IsomorphicBuffer): void;
    pipe(socket: SocketAdapter): void;
}

export function throttle<T>(threshold: number)
{
    if (threshold < 1)
        throw new Error('Threshold must be greater than 0');
    if (threshold == Number.POSITIVE_INFINITY || threshold == Number.MAX_SAFE_INTEGER)
        return function (handler: () => Promise<T>): Promise<T>
        {
            return handler();
        }

    const open = new Array<Promise<unknown>>(threshold);
    let rr = -1;
    console.time('throttle');
    return function (handler: () => Promise<T>): Promise<T>
    {
        rr = (rr + 1) % threshold;
        if (!open[rr])
        {
            const result = handler();
            open[rr] = result
            return result;
        }
        else
        {
            const result = open[rr].then(() => handler())
            open[rr] = result;
            return result;
        }
    }
}
