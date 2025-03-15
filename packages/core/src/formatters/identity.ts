import { Formatter, ReversibleFormatter } from "./common.js";

/**
 * Returns the input value.
 * @param {T} a - The input value.
 * @returns {T} The same input value.
 */
function identity<T>(a: T): T
{
    return a;
}

identity['reverse'] = identity;

/**
 * Identity formatter class.
 */
export default class Identity implements Formatter<unknown>, ReversibleFormatter<unknown, unknown>
{
    static readonly instance = new Identity();

    /**
     * Returns the input value.
     * @param {T} value - The input value.
     * @returns {T} The same input value.
     */
    format<T>(value: T): T
    {
        return value;
    }

    /**
     * Returns the input value.
     * @param {T} value - The input value.
     * @returns {T} The same input value.
     */
    unformat<T>(value: T): T
    {
        return value;
    }

};
