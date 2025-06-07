import { IsomorphicBuffer, BufferEncoding } from '@akala/core';
import { Cursor } from './_common.js';
import assert from 'assert';
import FixedString from './string-fixed.js';

export default class ConstantString<TString extends string = string> extends FixedString<TString>
{
    constructor(private readonly value: TString, encoding: BufferEncoding = 'ascii')
    {
        super(value.length, encoding);
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor): TString
    {
        const value = super.read(buffer, cursor);
        assert.strictEqual(value, this.value);

        return value;
    }
    write(value: TString): void
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: TString): IsomorphicBuffer[]
    write(buffer: IsomorphicBuffer | TString, cursor?: Cursor, value?: TString): IsomorphicBuffer[] | void
    {
        if (typeof buffer == 'string')
            value = buffer;

        assert.strictEqual(value, this.value);

        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        if (typeof (buffer) === 'string')
            return [IsomorphicBuffer.from(value, this.encoding)];
        else
            cursor.offset += buffer.write(value, cursor.offset, this.length, this.encoding);
    }
}
