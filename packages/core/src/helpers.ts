import ErrorWithStatus, { HttpStatusCode } from "./errorWithStatus.js";
import { base64 } from "./index.js";

export type Remote<T> = { [key in keyof T]: T[key] extends (...args) => infer X ? X extends Promise<unknown> ? X : Promise<X> : (T[key] | undefined) }
export type Serializable = string | number | string[] | number[] | boolean | boolean[] | SerializableObject | SerializableObject[];
export type TypedSerializable<T> = T extends Array<infer U> ? TypedSerializable<U>[] : string | number | boolean | TypedSerializableObject<T>;
export type SerializableObject = { [key: string]: Serializable };
export type TypedSerializableObject<T> = { [key in keyof T]: TypedSerializable<T> };

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

export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: unknown[]): string;
    (obj: { key: string, fallback: string }): string;
    (obj: { key: string, fallback: string }, ...parameters: unknown[]): string;
}

export class IsomorphicBuffer implements Iterable<number, number, number>
{
    private readonly buffer: Uint8Array<ArrayBufferLike>
    constructor(buffer: Uint8Array<ArrayBufferLike> | number, private readonly offset?: number, private readonly end?: number)
    {
        if (typeof buffer == 'number')
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

    public static fromBuffer(buffer: Buffer | Uint8Array)
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
        offset = this.ensureOffset(offset);
        if (sourceOffset == 0 && (typeof length == undefined || length == source.length))
            this.buffer.set(source.toArray(), offset);
        this.buffer.set(source.subarray(sourceOffset, sourceOffset + length).toArray(), offset);
    }
    toArray(): ArrayLike<number>
    {
        return this.buffer.slice(this.offset, this.end);
    }

    public static concat(buffers: IsomorphicBuffer[])
    {
        const totalLength = buffers.reduce((previous, current) => previous + current.length, 0);
        const target = new IsomorphicBuffer(totalLength);
        let offset = 0;
        for (const buffer of buffers)
        {
            target.copy(buffer, offset)
            offset += buffer.length;
        }
        return target;
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
                return IsomorphicBuffer.fromArrayBuffer(base64.strToUTF8Arr(s));
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
            case "utf16le":
            case "utf-16le":
            case "ucs2":
            case "ucs-2":
            case "base64url":
            case "latin1":
            case "binary":
        }
    }

    public toString(encoding: BufferEncoding, offset?: number, end?: number): string
    {
        if (offset)
            return this.subarray(offset, end).toString(encoding);
        switch (encoding)
        {
            case "ascii": {
                const result = new Array<string>(this.length);
                for (let i = this.offset; i < this.end; i++)
                    result[i] = String.fromCharCode(this.buffer[i]);
                return result.join('');
            }
            case "utf8":
            case "utf-8":
                return base64.UTF8ArrToStr(this.buffer);
            case "base64":
                return base64.base64EncArr(this.buffer);
            case "hex":
                return (Array.prototype.map.call(this.buffer, v => v.toString('x')) as string[]).join('')
            case "binary":
            case "utf16le":
            case "utf-16le":
            case "ucs2":
            case "ucs-2":
            case "base64url":
            case "latin1":
        }
    }

    public toJSON()
    {
        return { data: this.buffer.slice(this.offset, this.end) }
    }

    public write(s: string, offset: number, length?: number, encoding?: BufferEncoding)
    {
        if (typeof length === 'undefined')
            length = s.length;

        if (length !== s.length)
            return this.write(s.substring(0, length), offset, undefined, encoding);

        this.copy(IsomorphicBuffer.from(s, encoding), offset);
    }

    private ensureOffset(offset: number, length: number = 1)
    {
        offset += this.offset;
        if (offset < this.offset || offset + length > this.end)
            throw new Error('Out of limits')
        return offset;
    }

    public fill(value: number, start?: number, end?: number)
    {
        end = this.ensureOffset(end, 1);
        start = this.ensureOffset(start, 1);
        this.buffer.fill(value, start, end)
    }

    public readUInt8(index?: number)
    {
        index = this.ensureOffset(index);
        return this.buffer[index];
    }

    public writeUInt8(value: number, index?: number)
    {
        index = this.ensureOffset(index)
        this.buffer[index] = value;
    }

    public readDoubleBE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeDoubleBE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readDoubleLE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeDoubleLE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readFloatBE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeFloatBE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readFloatLE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeFloatLE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readUInt16LE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUInt16LE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readUInt16BE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUInt16BE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readInt16BE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeInt16BE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readInt16LE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeInt16LE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }


    public readUInt32LE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUInt32LE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readUInt32BE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUInt32BE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readInt32BE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeInt32BE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readInt32LE(index?: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeInt32LE(value: number, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readBigUInt64LE(index?: number): bigint
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeBigUInt64LE(value: bigint, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readBigUInt64BE(index?: number): bigint
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeBigUInt64BE(value: bigint, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readBigInt64BE(index?: number): bigint
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeBigInt64BE(value: bigint, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }
    public readBigInt64LE(index?: number): bigint
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeBigInt64LE(value: bigint, index?: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readUIntBE(index: number, length: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUIntBE(value: number, index: number, length: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public readUIntLE(index: number, length: number): number
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }

    public writeUIntLE(value: number, index: number, length: number)
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
    }


    public subarray(start: number, end?: number)
    {
        if (typeof end == 'undefined')
            end = this.end;
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

}
