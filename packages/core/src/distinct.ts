//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function distinct<T>(array: T[], distinctKey?: (item: T) => any | number | bigint): T[]
{
    if (distinctKey)
        return distinctWithCompareFn(array, (a, b) => distinctKey(a) - distinctKey(b))
    return distinctWithCompareFn(array);
}

export function distinctStrings<T>(array: T[], distinctKey?: (item: T) => string): T[]
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
        return distinctWithCompareFn(array, (a, b) => compare(distinctKey(a), distinctKey(b)))
    return distinctWithCompareFn(array as string[], compare) as T[];
}

export function distinctWithCompareFn<T>(array: T[], compare?: (a: T, b: T) => number): T[]
{
    const result = array.slice(0);
    if (compare)
        result.sort(compare);
    else
        result.sort();
    for (let i = 1; i < result.length - 1; i++)
    {
        if (result[i] == result[i - 1])
        {
            result.splice(i--, 1);
        }
    }
    return result;
}