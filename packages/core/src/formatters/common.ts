/**
 * Interface for a formatter.
 */
export interface Formatter<TResult>
{
    /**
     * Formats a value.
     * @param {unknown} value - The value to format.
     * @returns {TResult} The formatted value.
     */
    format(value: unknown): TResult;
}

/**
 * Interface for a reversible formatter.
 */
export interface ReversibleFormatter<TResult, TOrigin> extends Formatter<TResult>
{
    /**
     * Unformats a value.
     * @param {TResult} value - The value to unformat.
     * @returns {TOrigin} The unformatted value.
     */
    unformat(value: TResult): TOrigin;
}

/**
 * Type for a formatter factory.
 */
export type FormatterFactory<TResult, TSettings extends unknown[] = unknown[]> = new (...args: TSettings) => Formatter<TResult>

/**
 * Type for a reversible formatter factory.
 */
export type ReversibleFormatterFactory<TResult, TOrigin, TSettings extends unknown[] = unknown[]> = new (...args: TSettings) => ReversibleFormatter<TResult, TOrigin>

/**
 * Checks if a formatter is reversible.
 * @param {Formatter<T> | (new (...args: TArgs) => Formatter<T>)} formatter - The formatter to check.
 * @returns {boolean} True if the formatter is reversible, false otherwise.
 */
export function isReversible<T, TArgs extends unknown[]>(formatter: (new (...args: TArgs) => Formatter<T>)): formatter is (new (...args: TArgs) => Formatter<T> & ReversibleFormatter<T, unknown>)
export function isReversible<T>(formatter: Formatter<T>): formatter is ReversibleFormatter<T, unknown>
export function isReversible<T, TArgs extends unknown[]>(formatter: Formatter<T> | (new (...args: TArgs) => Formatter<T>)): formatter is ReversibleFormatter<T, unknown> | (new (...args: TArgs) => Formatter<T> & ReversibleFormatter<T, unknown>)
{
    switch (typeof formatter)
    {
        case 'function':
            return 'unformat' in formatter.prototype && typeof formatter.prototype.unformat == 'function';
        case 'object':
            return formatter && 'unformat' in formatter && typeof formatter.unformat == 'function';
        default:
            return false;
    }
}
