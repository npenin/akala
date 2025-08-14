import type { Formatter } from "./common.js";

/**
 * A formatter that returns the input value unchanged.
 * This is useful for scenarios where no transformation is needed.
 */
export default class Slice<T> implements Formatter<T[]>
{
    start: number;
    end: number;
    constructor(settings: { start?: number, end?: number } | number)
    {
        if (typeof settings === 'number')
        {
            settings = { start: 0, end: settings };
        }
        this.start = settings.start ?? 0;
        this.end = settings.end ?? Infinity;

    }
    /**
     * Returns the input value without modification.
     * @template T - The type of the input value.
     * @param {T} value - The value to format.
     * @returns {T} The same input value.
     */
    format<T>(value: T[]): T[]
    {
        return value?.slice(this.start, this.end) || [];
    }
}
