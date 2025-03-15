import { Formatter, ReversibleFormatter } from "./common.js";

/**
 * Class representing a JSON formatter.
 */
export default class Json implements Formatter<string>, ReversibleFormatter<string, unknown>
{
    /**
     * Formats a value as a JSON string.
     * @param {unknown} value - The value to format.
     * @returns {string} The formatted JSON string.
     */
    format(value: unknown): string
    {
        return JSON.stringify(value);
    }

    /**
     * Parses a JSON string to a value.
     * @param {string} value - The JSON string to parse.
     * @returns {T} The parsed value.
     */
    unformat<T>(value: string): T
    {
        return JSON.parse(value);
    }
};
