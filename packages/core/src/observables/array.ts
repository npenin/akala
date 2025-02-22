import { Event } from "../event-emitter.js";
import { Formatter, formatters } from "../formatters/index.js";
import { isPromiseLike } from "../promiseHelpers.js";
import { Subscription } from "../teardown-manager.js";
import { watcher } from "./shared.js";

export type ObservableArrayPopEvent<T> =
    {
        action: 'pop'
        oldItems: T[]
    }

export type ObservableArrayPushEvent<T> =
    {
        action: 'push'
        newItems: T[]
    }

export type ObservableArrayShiftEvent<T> =
    {
        action: 'shift'
        oldItems: T[]
    }

export type ObservableArrayUnshiftEvent<T> =
    {
        action: 'unshift'
        newItems: T[]
    }
export type ObservableArrayReplaceEvent<T> =
    {
        action: 'replace'
        replacedItems: { index: number, oldItem: T, newItem: T }[];

    };

export type ObservableArrayInitEvent<T> =
    {
        action: 'init';
        newItems: T[];
    }

export type ObservableArrayEventMap<T> = ObservableArrayPopEvent<T> | ObservableArrayPushEvent<T> | ObservableArrayShiftEvent<T> | ObservableArrayUnshiftEvent<T> | ObservableArrayReplaceEvent<T> | ObservableArrayInitEvent<T>;

export interface ObservableArrayEventArgs<T>
{
    action: 'init' | 'push' | 'shift' | 'pop' | 'unshift' | 'replace';
    newItems?: T[];
    oldItems?: T[];
}

export class ObservableArray<T> extends Event<[ObservableArrayEventMap<T>], void, { triggerAtRegistration?: boolean, once?: boolean }>
{
    public readonly array: Array<T>;
    constructor(array: Array<T> | ObservableArray<T>)
    {
        super(Event.maxListeners, null);
        if (watcher in array)
            return array[watcher] as ObservableArray<T>;
        this.array = array;
        Object.defineProperty(array, watcher, { value: this, enumerable: false, configurable: false })
        for (let i = 0; i < array.length; i++)
        {
            Object.defineProperty(this, i, {
                get: () => this.array[i],
            })
        }
    }


    public [watcher] = this;

    public get length() { return this.array.length; }
    public set length(value: number)
    {
        const oldItems = this.array.slice(value);
        this.emit({
            action: 'pop',
            oldItems: oldItems
        });
        this.array.length = value;
    }

    public push(...items: T[])
    {
        this.array.push(...items);

        const finalLength = this.array.length + items.length;
        for (let i = this.array.length; i < finalLength; i++)
        {
            Object.defineProperty(this, i, {
                get: () => this.array[i],
            })
        }
        this.emit({
            action: 'push',
            newItems: items
        });

        return finalLength;
    }


    public shift(count: number = 1)
    {
        const items = this.array.splice(0, count);

        for (let i = this.array.length - count; i < this.array.length; i++)
        {
            delete this[i];
        }

        this.emit({
            action: 'shift',
            oldItems: items
        });
    }
    public pop(count: number = 1)
    {
        const items = this.array.splice(this.array.length - count, count);

        for (let i = this.array.length - count; i < this.array.length; i++)
        {
            delete this[i];
        }
        this.emit({
            action: 'pop',
            oldItems: items
        });
        return items;
    }
    public unshift = function (...items)
    {
        this.array.unshift(...items);

        const finalLength = this.array.length + items.length;
        for (let i = this.array.length; i < finalLength; i++)
        {
            Object.defineProperty(this, i, {
                get: () => this.array[i],
            })
        }
        this.emit({
            action: 'unshift',
            newItems: items
        });

        return finalLength;
    };

    public replace(index: number, item: T)
    {
        return this.replaceN([{ index, item }]);
    }

    public replaceN(x: { index: number, item: T }[])
    {
        this.emit({
            action: 'replace',
            replacedItems:
                x.map(({ index, item }) =>
                {
                    const oldItem = this.array[index];
                    this.array.splice(index, 1, item);
                    return { index: index, newItem: item, oldItem };
                }),
        });
    }

    public sort(comparer?: (a: T, b: T) => number)
    {
        const notSorted = this.array.slice(0)
        this.array.sort(comparer);
        const event: ObservableArrayReplaceEvent<T> = {
            action: 'replace',
            replacedItems: this.array.map((x, i) => x == notSorted[i] ? null : ({
                index: i,
                oldItem: notSorted[i],
                newItem: x
            })).filter(x => x)
        }
        if (event.replacedItems.length)
            this.emit(event)

        return this;
    }

    public addListener(listener: (args_0: ObservableArrayEventMap<T>) => void, options?: { triggerAtRegistration?: boolean, once?: boolean }): Subscription
    {
        const sub = super.addListener(listener, options);

        if (options?.triggerAtRegistration)
            listener({
                action: 'init',
                newItems: this.array.slice(0)
            })

        return sub;
    }

    private subcription?: Subscription;

    public splice(start: number, deleteCount?: number, ...replaceItems: T[])
    {
        if (deleteCount === (replaceItems?.length ?? 0))
        {
            if (deleteCount === 0)
                return replaceItems || [];
            const oldItems = this.array.splice(start, deleteCount, ...replaceItems);
            this.emit({
                action: 'replace',
                replacedItems: oldItems.map((oldItem, i) => ({
                    oldItem,
                    newItem: replaceItems[i],
                    index: i + start
                }))
            })
            return oldItems;
        }
        else if (deleteCount < (replaceItems?.length ?? 0))
        {
            const oldItems = this.splice(start, deleteCount, ...replaceItems.slice(0, deleteCount));
            this.push(...replaceItems.slice(deleteCount));
            return oldItems;
        }
        else
        {
            const oldItems = this.splice(start, replaceItems.length, ...replaceItems);
            oldItems.push(...this.pop(deleteCount - replaceItems.length));
            return oldItems;
        }
    }

    public replaceArray(values: T[] | ObservableArray<T>)
    {
        this.subcription?.();

        const array = Array.isArray(values) ? values : values.array;
        this.splice(0, this.length, ...array);

        if (!Array.isArray(values))
            this.subcription = values.addListener(ev =>
            {
                switch (ev.action)
                {
                    case "pop":
                        for (let i = 0; i < ev.oldItems.length; i++)
                            this.pop()
                        break;
                    case "push":
                        this.push(...ev.newItems)
                        break;
                    case "shift":
                        for (let i = 0; i < ev.oldItems.length; i++)
                            this.shift()
                        break;
                    case "unshift":
                        this.unshift(...ev.newItems)
                        break;
                    case "replace":
                        for (let i = 0; i < ev.replacedItems.length; i++)
                            this.replace(ev.replacedItems[i].index, ev.replacedItems[i].newItem);
                        break;
                    case "init":
                        this.replaceArray(ev.newItems);
                        break;
                }
            })
    }

    public indexOf(searchElement: T, fromIndex?: number): number
    public indexOf(...args: Parameters<typeof Array.prototype.indexOf>): ReturnType<typeof Array.prototype.indexOf>
    {
        return this.array.indexOf(...args);
    }

    public map<U>(...args: Parameters<typeof Array.prototype.map<U>>): ReturnType<typeof Array.prototype.map<U>>
    {
        return this.array.map(...args);
    }

    public reduce<U>(...args: Parameters<typeof Array.prototype.reduce<U>>): ReturnType<typeof Array.prototype.reduce<U>>
    {
        return this.array.reduce(...args);
    }

    public filter(...args: Parameters<typeof Array.prototype.filter>): ReturnType<typeof Array.prototype.filter>
    {
        return this.array.filter(...args);
    }

    public find(...args: Parameters<typeof Array.prototype.find>): ReturnType<typeof Array.prototype.find>
    {
        return this.array.find(...args);
    }

    public forEach(...args: Parameters<typeof Array.prototype.forEach>): ReturnType<typeof Array.prototype.forEach>
    {
        return this.array.forEach(...args);
    }

    public [Symbol.iterator]()
    {
        return this.array[Symbol.iterator]();
    }

    public toString(): string
    {
        return this.array.toString();
    }

    public [Symbol.dispose]()
    {
        this.subcription?.();
        super[Symbol.dispose]();
    }
}


export class AsyncArrayFormatter<T> implements Formatter<ObservableArray<T>>
{
    private promise: PromiseLike<T[] | ObservableArray<T>>;
    private value: T[] | ObservableArray<T>;
    private result: ObservableArray<T> = new ObservableArray([]);

    format(value: T[] | ObservableArray<T>)
    {
        if (!isPromiseLike(value))
        {
            if (this.value != value)
            {
                this.value = value;
                this.result.replaceArray(this.value);
            }
        }
        else
        {
            if (this.promise !== value)
            {
                this.promise = value;
                this.value = null;
                if (this.result.length)
                    this.result.replaceArray([]);
                value.then(v =>
                {
                    this.value = v;
                    this.result.replaceArray(v);
                }, err => console.debug('a watched promise failed with err %O', err));
            }
        }
        return this.result;
    }

    constructor()
    {
    }
}

formatters.register('#asyncArray', AsyncArrayFormatter);