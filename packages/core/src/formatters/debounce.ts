import { Event } from "../event-emitter.js";
import { debounce } from "../observables/shared.js";
import { ReversibleFormatter } from "./common.js";

/**
 * Class representing a Debounce.
 * @template T
 * @implements {ReversibleFormatter<T, Promise<T>>}
 * @implements {Disposable}
 */
export class Debounce<T> implements ReversibleFormatter<T, Promise<T>>, Disposable
{
    /**
     * Create a Debounce.
     * @param {number} delay - The delay in milliseconds.
     */
    constructor(private delay: number) { }

    /**
     * Dispose of the Debounce.
     */
    [Symbol.dispose](): void
    {
        if (this.timeout)
            clearTimeout(this.timeout);
        this.event[Symbol.dispose]();
    }

    private timeout: ReturnType<typeof setTimeout>;
    private event: Event<[T]> = new Event(100);

    /**
     * Unformat a value.
     * @param {T} value - The value to unformat.
     * @returns {Promise<T>} A promise that resolves to the unformatted value.
     */
    unformat(value: T): Promise<T>
    {
        return new Promise(resolve =>
        {
            debounce(this.event, this.delay).addListener(resolve, { once: true });
            this.event.emit(value);
        })
    }

    /**
     * Format a value.
     * @param {T} value - The value to format.
     * @returns {T} The formatted value.
     */
    format(value: T): T
    {
        return value;
    }
}
