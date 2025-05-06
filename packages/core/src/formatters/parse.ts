import { Expressions } from "../parser/expressions/index.js";
import { Parser } from "../parser/parser.js";
import { ReversibleFormatter } from "./common.js";

export class Parse implements ReversibleFormatter<Expressions, string>
{
    unformat(value: Expressions): string
    {
        return value.toString();
    }
    format(value: string): Expressions
    {
        return Parser.parameterLess.parse(value);
    }

}
