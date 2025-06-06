import PrefixedString from "../string-prefixed.js";
import { Parsers } from "../_common.js";
import { WireType } from './field.js';
import { BufferEncoding } from "@akala/core";

export default class String extends PrefixedString
{
    public readonly wireType: WireType = 'length-delimited'

    constructor(parser: Parsers<number>, encoding?: BufferEncoding)
    {
        super(parser, encoding);
    }
}
