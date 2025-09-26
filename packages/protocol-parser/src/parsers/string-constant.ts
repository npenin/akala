import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer, type BufferEncoding } from '@akala/core';
import { Cursor } from './_common.js';
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
        if (this.value !== value)
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, `${this.value} was expected, but received ${value}`);

        return value;
    }
    write(buffer: IsomorphicBuffer, cursor: Cursor, value?: TString): void
    {
        if (typeof buffer == 'string')
            value = buffer;

        if (this.value !== value)
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, `${this.value} was expected, but received ${value}`);

        if (cursor.subByteOffset > 0)
            throw new Error('Cross byte value are not supported');

        cursor.offset += buffer.write(value, cursor.offset, this.length, this.encoding);
    }
}
