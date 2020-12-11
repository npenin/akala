export class OrderedList<TKey extends string | number, TValue> implements Iterable<TValue>
{
    tryGetValue(key: TKey): TValue[]
    {
        //@ts-ignore 2536
        return this.items[key];
    }
    constructor()
    {
    }

    private items: { [key: string]: TValue[] } = {} as any;

    public push(key: string | number, value: TValue)
    {
        //@ts-ignore 2536
        var values = this.items[key] = this.items[key] || [];
        values.push(value);
    }

    public get length()
    {
        return Object.keys(this.items).reduce((prec, key) =>
        {
            return prec + this.items[key].length;
        }, 0);
    }

    public remove(key?: string | number | undefined, value?: TValue)
    {
        if (typeof key === 'undefined' && typeof value === 'undefined')
            throw new Error('key and value cannot be undefined');
        if (typeof (key) == 'undefined')
        {
            for (var k of Object.keys(this.items))
            {
                let values: TValue[] = this.items[k];
                var indexOfValue = values.indexOf(value as TValue);
                if (indexOfValue === -1)
                    break;
                if (values.splice(indexOfValue, 1))
                    break;
            }
        }
        else
        {
            if (typeof (value) == 'undefined')
                //@ts-ignore 2536
                delete this.items[key];
            else
            {
                //@ts-ignore 2536
                var values: TValue[] = this.items[key];
                if (typeof (values) != 'undefined')
                {
                    var indexOfValue = values.indexOf(value);
                    values.splice(indexOfValue, 1)
                    if (values.length == 0)
                        //@ts-ignore 2536
                        delete this.items[key];
                }
            }
        }
    }

    public *[Symbol.iterator](): Iterator<TValue>
    {
        for (var key of Object.keys(this.items))
        {
            for (var value of this.items[key])
                yield value;
        }
    }

    public keys(): Iterable<string | number>
    {
        var items = this.items;
        return {
            *[Symbol.iterator]()
            {
                for (var key of Object.keys(items))
                {
                    yield key;
                }
            }
        }
    }

    public entries(): Iterable<{ key: string | number, value: TValue[] }>
    {
        var items = this.items;
        return {
            *[Symbol.iterator]()
            {
                for (var key of Object.keys(items))
                {
                    yield { key: key, value: items[key] };
                }
            }
        }
    }
}
