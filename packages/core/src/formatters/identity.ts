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
 * A formatter that returns the input value unchanged.
 * This is useful for scenarios where no transformation is needed.
 */
export default class Identity implements Formatter<unknown>, ReversibleFormatter<unknown, unknown>
{
    /**
     * Singleton instance for reuse.
     */
    static readonly instance = new Identity();

    /**
     * Returns the input value without modification.
     * @template T - The type of the input value.
     * @param {T} value - The value to format.
     * @returns {T} The same input value.
     */
    format<T>(value: T): T
    {
        return value;
    }

    /**
     * Returns the input value without modification.
     * @template T - The type of the input value.
     * @param {T} value - The value to unformat.
     * @returns {T} The same input value.
     */
    unformat<T>(value: T): T
    {
        return value;
    }
}
