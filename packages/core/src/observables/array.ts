import { Event, Subscription } from "../event-emitter.js";
import { watcher } from "./object.js";

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
        this.emit({
            action: 'push',
            newItems: items
        });
    }


    public shift(count: number = 1)
    {
        const items = this.array.splice(0, count);
        this.emit({
            action: 'shift',
            oldItems: items
        });
    }
    public pop(count: number = 1)
    {
        const items = this.array.splice(this.array.length - count, count);
        this.emit({
            action: 'pop',
            oldItems: items
        });
        return items;
    }
    public unshift = function (...items)
    {
        this.array.unshift(...items);
        this.emit({
            action: 'unshift',
            newItems: items
        });
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

        // this.replaceN(array.filter((_, i) => i < this.array.length).map((v, i) => ({
        //     index: i, item: v
        // })))

        // if (this.length < values.length)
        // {
        //     if (Array.isArray(values))
        //         this.push(...values.slice(this.length));
        //     else
        //         this.push(...values.array.slice(this.length));
        // }
        // else if (this.length > values.length)
        // {
        //     this.pop(this.length - array.length)
        // }

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