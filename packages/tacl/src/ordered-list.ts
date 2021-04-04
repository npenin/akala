export class OrderedList<TKey extends string | number, TValue> implements Iterable<TValue>
{
    tryGetValue(key: TKey): TValue[]
    {
        return this.items[key];
    }
    constructor()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    {
    }

    private items: { [key: string]: TValue[] } = {};

    public push(key: string | number, value: TValue): void
    {
        const values = this.items[key] = this.items[key] || [];
        values.push(value);
    }

    public get length(): number
    {
        return Object.keys(this.items).reduce((prec, key) =>
        {
            return prec + this.items[key].length;
        }, 0);
    }

    public remove(key?: string | number | undefined, value?: TValue): void
    {
        if (typeof key === 'undefined' && typeof value === 'undefined')
            throw new Error('key and value cannot be undefined');
        if (typeof (key) == 'undefined')
        {
            for (const k of Object.keys(this.items))
            {
                const values: TValue[] = this.items[k];
                const indexOfValue = values.indexOf(value as TValue);
                if (indexOfValue === -1)
                    break;
                if (values.splice(indexOfValue, 1))
                    break;
            }
        }
        else
        {
            if (typeof (value) == 'undefined')
                delete this.items[key];
            else
            {
                const values: TValue[] = this.items[key];
                if (typeof (values) != 'undefined')
                {
                    const indexOfValue = values.indexOf(value);
                    values.splice(indexOfValue, 1)
                    if (values.length == 0)
                        delete this.items[key];
                }
            }
        }
    }

    public *[Symbol.iterator](): Iterator<TValue>
    {
        for (const key of Object.keys(this.items))
        {
            for (const value of this.items[key])
                yield value;
        }
    }

    public keys(): Iterable<string | number>
    {
        const items = this.items;
        return {
            *[Symbol.iterator]()
            {
                for (const key of Object.keys(items))
                {
                    yield key;
                }
            }
        }
    }

    public entries(): Iterable<{ key: string | number, value: TValue[] }>
    {
        const items = this.items;
        return {
            *[Symbol.iterator]()
            {
                for (const key of Object.keys(items))
                {
                    yield { key: key, value: items[key] };
                }
            }
        }
    }
}
