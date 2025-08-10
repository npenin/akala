import { type ParsersWithMessage } from "./index.js";
import Series from './series.js';
import { type AnyParser, Cursor, type Parser } from './_common.js';
import { IsomorphicBuffer } from "@akala/core";

export default class ObjectParser<T extends object> extends Series<T, Partial<T>> implements Parser<T>
{
    maps: AnyParser<T[keyof T], T>[];
    constructor(...parsers: ParsersWithMessage<any, Partial<T>>[])
    {
        super(...parsers)
    }

    read(buffer: IsomorphicBuffer, cursor: Cursor, message?: T): T
    {
        var result = message || {};

        return super.read(buffer, cursor, result) as T;
    }
}
