import { IsomorphicBuffer } from '@akala/core';
import { Cursor, parsers } from '@akala/protocol-parser'
import * as zlib from 'zlib';
import { promisify } from 'util';

export enum FileType
{
    File = '0',
    HardLink = '1',
    SymbolicLink = '2',
    Directory = '5',
}

export interface TarFile
{
    offset: number;
    fileName: string;           // 100 bytes
    mode: string;               // 8 bytes
    ownerId: string;            // 8 bytes
    groupId: string;            // 8 bytes
    fileSize: string;           // 12 bytes (octal)
    mtime: string;              // 12 bytes (octal)
    checksum: string;           // 8 bytes
    typeFlag: string;           // 1 byte
    linkName: string;           // 100 bytes
    magic: string;              // 6 bytes
    version: string;            // 2 bytes
    uname: string;              // 32 bytes
    gname: string;              // 32 bytes
    devMajor: string;           // 8 bytes
    devMinor: string;           // 8 bytes
    prefix: string;             // 155 bytes
    // 12 bytes padding at the end (not included here)
    data: IsomorphicBuffer;
}

class DataParser<const TKey extends keyof TarFile> extends parsers.PreparsedLengthBuffer<TarFile, TKey>
{
    constructor(lengthProperty: TKey, dismissMainBuffer: boolean = false)
    {
        super(lengthProperty, dismissMainBuffer)
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TarFile): IsomorphicBuffer
    {
        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        const length = Number(message[this.lengthProperty]);

        if (isNaN(length))
            debugger;


        for (let i = 0; i < length && cursor.offset + i < buffer.length; i++)
        {
            if (length < 512 && buffer.readUInt8(cursor.offset + i) === 0 || i % 512 == 0 && buffer.subarray(cursor.offset + i + 257, cursor.offset + i + 257 + 6).toString('ascii') == message.magic)
            // if (buffer.readUInt16LE(cursor.offset + i) === 0 || i % 512 == 0 && buffer.subarray(cursor.offset + i + 257, cursor.offset + i + 257 + 5).toString('ascii') == message.magic)
            {
                let result: IsomorphicBuffer = buffer.subarray(cursor.offset, cursor.offset += i);
                const indexOfEnd = result.indexOf(0);
                if (indexOfEnd !== -1 && indexOfEnd < result.length)
                    result = result.subarray(0, indexOfEnd);

                if (this.dismissMainBuffer)
                    return new IsomorphicBuffer(result.toArray());
                return result;
            }
        }
        return super.read(buffer, cursor, message);
    }
}

class RoundParser implements parsers.Parser<string>
{
    constructor(private readonly round: number)
    {

    }
    getLength(value: string): number
    {
        throw new Error('Method not implemented.');
    }

    length: number = -1;
    read(buffer: IsomorphicBuffer, cursor: Cursor)
    {
        const remaining = cursor.offset % this.round;
        if (remaining == 0)
            return ''
        cursor.offset += this.round - remaining;
        return ''
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: string): void
    {
        throw new Error('Method not implemented.');
    }

}

class OffsetCapture<T> implements parsers.ParserWithMessage<number, T>
{
    constructor(public readonly property: keyof T)
    {

    }
    getLength(value: number, message?: T): number
    {
        throw new Error('Method not implemented.');
    }
    readonly length = 0;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: T): number
    {
        return cursor.offset;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value: number): void
    {
    }

}

class TerminatedString<TMessage, TString extends string = string> implements parsers.ParserWithMessage<TString, TMessage>
{
    constructor(private readonly terminator: string | string[], private readonly parser: parsers.AnyParser<TString, TMessage>)
    {
        this.length = parser.length;
    }
    getLength(value: TString, message?: TMessage): number
    {
        return this.parser.getLength(value, message);
    }
    length: number;
    read(buffer: IsomorphicBuffer, cursor: Cursor, message: TMessage): TString
    {
        const result = this.parser.read(buffer, cursor, message);
        if (typeof this.terminator == 'string')
        {
            const indexOfTerminator = result.indexOf(this.terminator);
            if (indexOfTerminator > -1)
                return result.substring(0, indexOfTerminator) as TString;
        }
        else
            for (const terminator of this.terminator)
            {
                const indexOfTerminator = result.indexOf(terminator);
                if (indexOfTerminator > -1)
                    return result.substring(0, indexOfTerminator) as TString;
            }
        return result;
    }
    write(buffer: IsomorphicBuffer & TString, cursor: Cursor & TMessage, value: TString, message: TMessage): void | IsomorphicBuffer[]
    {
        return this.parser.write(buffer, cursor, value, message);
    }
}

const tarParser = parsers.object<TarFile>(
    parsers.property('offset', new OffsetCapture('offset')),
    parsers.property('fileName', new TerminatedString<TarFile>('\0', parsers.string(100, 'ascii'))),
    parsers.property('mode', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('ownerId', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('groupId', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('fileSize', new TerminatedString<TarFile>('\0', parsers.string(12, 'ascii'))),
    parsers.property('mtime', new TerminatedString<TarFile>(' ', parsers.string(12, 'ascii'))),
    parsers.property('checksum', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('typeFlag', parsers.string<FileType>(1, 'ascii')),
    parsers.property('linkName', new TerminatedString<TarFile>('\0', parsers.string(100, 'ascii'))),
    parsers.property('magic', parsers.string(6, 'ascii')),
    parsers.property('version', new TerminatedString<TarFile>('\0', parsers.string(2, 'ascii'))),
    parsers.property('uname', new TerminatedString<TarFile>('\0', parsers.string(32, 'ascii'))),
    parsers.property('gname', new TerminatedString<TarFile>('\0', parsers.string(32, 'ascii'))),
    parsers.property('devMajor', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('devMinor', new TerminatedString<TarFile>('\0', parsers.string(8, 'ascii'))),
    parsers.property('prefix', new TerminatedString<TarFile>('\0', parsers.string(155, 'ascii'))),
    parsers.skip(12),
    parsers.property('data', new DataParser('fileSize')),
    new RoundParser(512)
);

export function* readTarEntries(buffer: IsomorphicBuffer): Generator<TarFile>
{
    const cursor = new Cursor();

    while (cursor.offset < buffer.length)
    {
        // Check for end of archive (two consecutive zero blocks)
        if (buffer.readUInt16LE(cursor.offset) === 0)
            break;

        const file = tarParser.read(buffer, cursor, {});

        yield file;
    }
}



const gunzip = promisify(zlib.gunzip);


export async function readTgzEntries(gzippedBuffer: Buffer): Promise<Generator<TarFile>>
{
    // First decompress the gzipped buffer
    const uncompressedBuffer = await gunzip(gzippedBuffer);

    // Then use existing tar reader
    return readTarEntries(IsomorphicBuffer.fromBuffer(uncompressedBuffer));
}
