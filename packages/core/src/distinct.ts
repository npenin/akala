/** 
 * Removes duplicate elements from an array based on a comparison key or natural ordering
 * @template T - Element type
 * @param {T[]} array - Input array to process
 * @param {((item: T) => any | number | bigint)} [distinctKey] - Function to extract comparison key from elements
 * @param {boolean} [keepOrder=true] - Preserve original element order
 * @returns {T[]} - Array with duplicates removed
 */
export function distinct<T>(array: T[], distinctKey?: (item: T) => any | number | bigint, keepOrder?: true): T[]
{
    if (distinctKey)
        return distinctWithCompareFn(array, (a, b) => distinctKey(a) - distinctKey(b), keepOrder)
    return distinctWithCompareFn(array, null, keepOrder);
}

/** 
 * Specialized version of distinct for string comparisons
 * @template T - Element type
 * @param {T[]} array - Input array to process
 * @param {((item: T) => string)} [distinctKey] - Function to extract string key from elements
 * @param {boolean} [keepOrder=true] - Preserve original element order
 * @returns {T[]} - Array with duplicates removed using string comparison
 */
export function distinctStrings<T>(array: T[], distinctKey?: (item: T) => string, keepOrder?: true): T[]
{
    const compare = (a: string, b: string) =>
    {
        if (a > b)
            return 1;
        if (a == b)
            return 0;
        return -1;
    }
    if (distinctKey)
        return distinctWithCompareFn(array, (a, b) => compare(distinctKey(a), distinctKey(b)), keepOrder)
    return distinctWithCompareFn(array as string[], compare, keepOrder) as T[];
}

/** 
 * Core distinct implementation using custom comparison logic
 * @template T - Element type
 * @param {T[]} array - Input array to process
 * @param {(a: T, b: T) => number} [compare] - Comparison function for ordering
 * @param {boolean} [keepOrder=true] - Preserve original element order
 * @returns {T[]} - Array with duplicates removed according to comparison logic
 */
export function distinctWithCompareFn<T>(array: T[], compare?: (a: T, b: T) => number, keepOrder?: true): T[]
{
    let original: T[];
    if (keepOrder)
        original = array.slice(0);
    const result = array.slice(0);
    if (compare)
        result.sort(compare);
    else
        result.sort();

    for (let i = 1; i <= result.length - 1; i++)
    {
        if (compare ? compare(result[i], result[i - 1]) === 0 : result[i] === result[i - 1])
        {
            result.splice(i--, 1);
            if (keepOrder)
                original.splice(original.lastIndexOf(result[i]), 1);
        }
    }
    return keepOrder ? original : result;
}
