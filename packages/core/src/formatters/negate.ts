import { Formatter } from "./common.js";

/**
 * A formatter that negates boolean values.
 * Converts any input to a boolean and returns its inverse.
 */
export default class Negate implements Formatter<boolean>
{
    static readonly instance = new Negate();

    /**
     * Converts the input to a boolean and returns its negation.
     * @template T - The type of the input value.
     * @param {T} value - The value to invert (non-booleans are coerced to boolean).
     * @returns {boolean} The logical inverse of the input's boolean value.
     */
    format<T>(value: T): boolean
    {
        return !value;
    }

};
