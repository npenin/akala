import { Event } from "../event-emitter.js";

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
        oldItems: T[]
        newItems: T[]
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

export class ObservableArray<T> extends Event<[ObservableArrayEventMap<T>], void>
{
    constructor(public readonly array: Array<T>)
    {
        super(Event.maxListeners, null);
    }

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


    public shift()
    {
        const item = this.array.shift();
        this.emit({
            action: 'shift',
            oldItems: [item]
        });
    }
    public pop()
    {
        const item = this.array.pop();
        this.emit({
            action: 'pop',
            oldItems: [item]
        });
    }
    public unshift = function (...items)
    {
        this.array.unshift(...items);
        this.emit({
            action: 'unshift',
            newItems: items
        });
    };
    public replace(index, item)
    {
        const oldItem = this.array[index];
        this.array['replace'](index, item);
        this.emit({
            action: 'replace',
            newItems: [item],
            oldItems: [oldItem]
        });
    }

    public init(): void
    {
        this.emit({
            action: 'init',
            newItems: this.array.slice(0),
        });
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
}