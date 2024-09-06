import { Formatter, ReversibleFormatter } from "./common.js";

function identity<T>(a: T): T
{
    return a;
}

identity['reverse'] = identity;

export default class Identity implements Formatter<unknown>, ReversibleFormatter<unknown, unknown>
{
    static readonly instance = new Identity();

    format<T>(value: T): T
    {
        return value;
    }
    unformat<T>(value: T): T
    {
        return value;
    }

};