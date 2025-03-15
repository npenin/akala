import { Formatter } from "./common.js";

/**
 * A formatter that converts any value to a boolean
 * 
 * @example
 * Booleanize.instance.format('truthy value') // returns true
 * Booleanize.instance.format(0) // returns false
 */
export default class Booleanize implements Formatter<boolean>
{
    /** Singleton instance for reusable formatter */
    static readonly instance = new Booleanize();

    /**
     * Converts any input value to a boolean using double negation
     * @param a - The value to convert to boolean
     * @returns Boolean representation of the input value
     */
    format(a: unknown)
    {
        return !!a;
    }
}
