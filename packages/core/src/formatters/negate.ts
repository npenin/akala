import { Formatter } from "./common.js";

/**
 * Negate class that implements the Formatter interface for boolean values.
 */
export default class Negate implements Formatter<boolean>
{
    static readonly instance = new Negate();

    /**
     * Negates the given value.
     * @param {T} value - The value to be negated.
     * @returns {boolean} The negated value.
     */
    format<T>(value: T): boolean
    {
        return !value;
    }

};
