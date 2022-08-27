import { Predicate, Project, PredicateAsync } from '@akala/core/expressions';
import { NotSupportedException } from './exceptions';


export function where<T>(source: Iterable<T>, predicate: Predicate<T>): Iterable<T>
{
    return {
        *[Symbol.iterator]()
        {
            for (const v of source)
                if (predicate(v))
                    yield v;
        }
    };
}

export function whereAsync<T>(source: Iterable<T> | AsyncIterable<T>, predicate: PredicateAsync<T>): AsyncIterable<T>
{
    return {
        async *[Symbol.asyncIterator]()
        {
            for await (const v of source)
                if (await predicate(v))
                    yield v;
        }
    };
}

export function any<T>(source: Iterable<T>, predicate: Predicate<T>): boolean
{
    for (const v of source)
        if (predicate(v))
            return true;
    return false;
}

export async function anyAsync<T>(source: Iterable<T>, predicate: PredicateAsync<T>): Promise<boolean>
{
    for (const v of source)
        if (await predicate(v))
            return true;
    return false;
}

export function length<T>(source: { length: number; } | Iterable<T>): number
{
    if (typeof source['length'] != 'undefined')
        return source['length'];

    let i = 0;
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const v of source as Iterable<T>)
    {
        i++;
    }
    return i;
}

export async function lengthAsync<T>(source: { length: number; } | Iterable<T> | AsyncIterable<T>): Promise<number>
{
    if (typeof source['length'] != 'undefined')
        return source['length'];

    let i = 0;
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const v of source as Iterable<T>)
    {
        i++;
    }
    return i;
}

export function select<T, U>(source: Iterable<T>, project: Project<T, U>): Iterable<U>
{
    return {
        *[Symbol.iterator]()
        {
            for (const value of source)
                yield project(value);
        }
    };
}

export function selectAsync<T, U>(source: Iterable<T> | AsyncIterable<T>, project: Project<T, Promise<U>>): AsyncIterable<U>
{
    return {
        async *[Symbol.asyncIterator]()
        {
            for await (const value of source)
                yield await project(value);
        }
    };
}

export function groupBy<T, U extends string | number>(source: Iterable<T>, criteria: Project<T, U>): Iterable<{ key: U; value: Iterable<T>; }>
{
    return {
        [Symbol.iterator]()
        {
            const groups: { [key: string]: Array<T>; } = {};
            const result = [];
            for (const value of source)
            {
                const group = criteria(value);
                console.log({ value, group, result: this.result });
                if (typeof this.result == 'object')
                {
                    throw new NotSupportedException('Not yet implemented');
                }
                if (typeof groups[this.result as string] == 'undefined')
                {
                    groups[this.result as string] = [];
                    result.push({ key: this.result, value: groups[this.result] });
                }
                groups[this.result as string].push(value);

            }
            return result[Symbol.iterator]();
        }
    };
}



export function groupByAsync<T, U extends string | number>(source: AsyncIterable<T>, criteria: Project<T, Promise<U>>): AsyncIterable<{ key: U; value: Iterable<T>; }>
{
    return {
        [Symbol.asyncIterator]()
        {
            let result: { key: U; value: Iterable<T>; }[];
            let groupIndex = 0;
            return {
                async next()
                {
                    if (typeof result !== 'undefined')
                        return { done: groupIndex >= result.length, value: result[groupIndex++] };
                    result = [];
                    const groups: { [key: string]: Array<T>; } = {};
                    for await (const value of source)
                    {
                        const group = await criteria(value);
                        console.log({ value, group, result: this.result });
                        if (typeof group == 'object')
                        {
                            throw new NotSupportedException('Not yet implemented');
                        }
                        if (typeof groups[group as string] == 'undefined')
                        {
                            groups[group as string] = [];
                            result.push({ key: group, value: groups[group] });
                        }
                        groups[group].push(value);
                    }
                    return { done: groupIndex >= result.length, value: result[groupIndex++] };
                }
            };
        }
    };
}
