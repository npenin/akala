import { Event } from "../events/shared.js";
import { type Formatter, formatters } from "../formatters/index.js";
import { isPromiseLike } from "../promiseHelpers.js";
import { type Subscription } from "../teardown-manager.js";
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

/**
 * ObservableArray class that extends Event.
 * @template T
 */
export class ObservableArray<T> extends Event<[ObservableArrayEventMap<T>], void, { triggerAtRegistration?: boolean, once?: boolean }>
{
    public readonly array: Array<T>;
    /**
     * Constructor for ObservableArray.
     * @param {Array<T> | ObservableArray<T>} array - The array to observe.
     */
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
                set: (value) => this.array[i] = value,
                configurable: true,
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

    /**
     * Pushes items to the array.
     * @param {...T[]} items - The items to push.
     * @returns {number} The new length of the array.
     */
    public push(...items: T[])
    {
        const arrayLength = this.array.length;
        this.array.push(...items);

        const finalLength = arrayLength + items.length;
        for (let i = arrayLength; i < finalLength; i++)
        {
            Object.defineProperty(this, i, {
                get: () => this.array[i],
                set: (value) => this.array[i] = value,
                configurable: true,
            })
        }
        this.emit({
            action: 'push',
            newItems: items
        });

        return finalLength;
    }

    /**
     * Shifts items from the array.
     * @param {number} [count=1] - The number of items to shift.
     * @returns {void}
     */
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

    /**
     * Pops items from the array.
     * @param {number} [count=1] - The number of items to pop.
     * @returns {T[]} The popped items.
     */
    public pop(count: number = 1)
    {
        const arrayLength = this.array.length;
        const items = this.array.splice(this.array.length - count, count);

        for (let i = arrayLength - count; i < arrayLength; i++)
        {
            delete this[i];
        }
        this.emit({
            action: 'pop',
            oldItems: items
        });
        return items;
    }

    /**
     * Unshifts items to the array.
     * @param {...T[]} items - The items to unshift.
     * @returns {number} The new length of the array.
     */
    public unshift(...items: T[])
    {
        this.array.unshift(...items);

        const finalLength = this.array.length + items.length;
        for (let i = this.array.length; i < finalLength; i++)
        {
            Object.defineProperty(this, i, {
                get: () => this.array[i],
                set: (value) => this.array[i] = value,
                configurable: true,
            })
        }
        this.emit({
            action: 'unshift',
            newItems: items
        });

        return finalLength;
    };

    /**
     * Replaces an item in the array.
     * @param {number} index - The index of the item to replace.
     * @param {T} item - The new item.
     * @returns {void}
     */
    public replace(index: number, item: T)
    {
        return this.replaceN([{ index, item }]);
    }

    /**
     * Replaces multiple items in the array.
     * @param {{ index: number, item: T }[]} x - The items to replace.
     * @returns {void}
     */
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

    /**
     * Sorts the array.
     * @param {(a: T, b: T) => number} [comparer] - The comparer function.
     * @returns {ObservableArray<T>} The sorted array.
     */
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

    /**
     * Adds a listener to the array.
     * @param {(args_0: ObservableArrayEventMap<T>) => void} listener - The listener function.
     * @param {{ triggerAtRegistration?: boolean, once?: boolean }} [options] - The options for the listener.
     * @returns {Subscription} The subscription.
     */
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

    /**
     * Splices the array.
     * @param {number} start - The start index.
     * @param {number} [deleteCount] - The number of items to delete.
     * @param {...T[]} replaceItems - The items to replace.
     * @returns {T[]} The deleted items.
     */
    public splice(start: number, deleteCount?: number, ...replaceItems: T[]): T[]
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

    /**
     * Replaces the array with a new array.
     * @param {T[] | ObservableArray<T>} values - The new array.
     * @returns {void}
     */
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
                        this.pop(ev.oldItems.length)
                        break;
                    case "push":
                        this.push(...ev.newItems)
                        break;
                    case "shift":
                        this.shift(ev.oldItems.length)
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

    /**
     * Finds the index of an element in the array.
     * @param {T} searchElement - The element to search for.
     * @param {number} [fromIndex] - The index to start the search at.
     * @returns {number} The index of the element.
     */
    public indexOf(searchElement: T, fromIndex?: number): number
    public indexOf(...args: Parameters<Array<T>['indexOf']>): ReturnType<Array<T>['indexOf']>
    {
        return this.array.indexOf(...args);
    }

    /**
     * Maps the array.
     * @param {...Parameters<Array<T>['map']<U>>} args - The arguments for the map function.
     * @returns {ReturnType<Array<T>['map']<U>>} The mapped array.
     */
    public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]
    {
        return this.array.map<U>(callbackfn, thisArg);
    }

    /**
     * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
     * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
     */
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T
    /**
     * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
     * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
     */
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue?: U): U
    {
        return this.array.reduce<U>(callbackfn, initialValue);
    }

    /**
     * Filters the array.
     * @param {...Parameters<Array<T>['filter']>} args - The arguments for the filter function.
     * @returns {ReturnType<Array<T>['filter']>} The filtered array.
     */
    public filter(...args: Parameters<Array<T>['filter']>): ReturnType<Array<T>['filter']>
    {
        return this.array.filter(...args);
    }

    /**
     * Finds an element in the array.
     * @param {...Parameters<Array<T>['find']>} args - The arguments for the find function.
     * @returns {ReturnType<Array<T>['find']>} The found element.
     */
    public find(...args: Parameters<Array<T>['find']>): ReturnType<Array<T>['find']>
    {
        return this.array.find(...args);
    }

    /**
     * Finds an element index in the array.
     * @param {...Parameters<Array<T>['findIndex']>} args - The arguments for the find function.
     * @returns {ReturnType<Array<T>['findIndex']>} The found element index.
     */
    public findIndex(...args: Parameters<Array<T>['findIndex']>): ReturnType<Array<T>['findIndex']>
    {
        return this.array.findIndex(...args);
    }

    /**
     * Iterates over the array.
     * @param {...Parameters<Array<T>['forEach']>} args - The arguments for the forEach function.
     * @returns {ReturnType<Array<T>['forEach']>} The result of the iteration.
     */
    public forEach(...args: Parameters<Array<T>['forEach']>): ReturnType<Array<T>['forEach']>
    {
        return this.array.forEach(...args);
    }

    public [Symbol.iterator]()
    {
        return this.array[Symbol.iterator]();
    }

    /**
     * Converts the array to a string.
     * @returns {string} The string representation of the array.
     */
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

/**
 * AsyncArrayFormatter class that implements Formatter.
 * @template T
 */
export class AsyncArrayFormatter<T> implements Formatter<ObservableArray<T>>
{
    private promise: PromiseLike<T[] | ObservableArray<T>>;
    private value: T[] | ObservableArray<T>;
    private readonly result: ObservableArray<T> = new ObservableArray([]);

    /**
     * Formats the value.
     * @param {T[] | ObservableArray<T>} value - The value to format.
     * @returns {ObservableArray<T>} The formatted value.
     */
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

formatters.register('asyncArray', AsyncArrayFormatter);
