//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function distinct<T>(array: T[], distinctKey?: (item: T) => any | number | bigint, keepOrder?: true): T[]
{
    if (distinctKey)
        return distinctWithCompareFn(array, (a, b) => distinctKey(a) - distinctKey(b), keepOrder)
    return distinctWithCompareFn(array, null, keepOrder);
}

export function distinctStrings<T>(array: T[], distinctKey?: (item: T) => string, keepOrder?: true): T[]
{
    const compare = (a: string, b: string) =>
    {
        if (a > b)
            return 1;
        if (a == b)
            return 0;
        return - 1;
    }
    if (distinctKey)
        return distinctWithCompareFn(array, (a, b) => compare(distinctKey(a), distinctKey(b)), keepOrder)
    return distinctWithCompareFn(array as string[], compare, keepOrder) as T[];
}

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
        if (compare(result[i], result[i - 1]) === 0)
        {
            result.splice(i--, 1);
            if (keepOrder)
                original.splice(original.lastIndexOf(result[i - 1]), 1)
        }
    }
    if (keepOrder)
        return original;
    return result;
}