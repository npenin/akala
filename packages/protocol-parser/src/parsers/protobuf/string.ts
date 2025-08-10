import PrefixedString from "../string-prefixed.js";
import { type Parsers } from "../_common.js";
import { type WireType } from './field.js';
import { type BufferEncoding } from "@akala/core";

export default class String extends PrefixedString
{
    public readonly wireType: WireType = 'length-delimited'

    constructor(parser: Parsers<number>, encoding?: BufferEncoding)
    {
        super(parser, encoding);
    }
}
