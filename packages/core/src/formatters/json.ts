import type { Formatter, ReversibleFormatter } from "./common.js";

/**
 * A formatter that converts values to and from JSON strings. Useful for serializing/deserializing data structures.
 */
export default class Json implements Formatter<string>, ReversibleFormatter<string, unknown>
{
    constructor(private readonly settings: { space: string | number })
    {

    }
    /**
     * Converts a value to a JSON string using default serialization.
     * @template T - The type of the input value.
     * @param {T} value - The value to serialize.
     * @returns {string} JSON string representation of the value.
     */
    format<T>(value: T): string
    {
        return JSON.stringify(value, null, this.settings.space);
    }

    /**
     * Parses a JSON string into its original data structure.
     * @param {string} value - The JSON string to deserialize.
     * @returns {T} The parsed object/array value.
     */
    unformat<T>(value: string): T
    {
        return JSON.parse(value);
    }
};
