/// <reference types="node" />
import { EventEmitter } from 'events';
export interface IWatched extends Object {
    $$watchers?: {
        [key: string]: Binding;
    };
}
export interface EventArgs {
    source: Binding;
    target: any;
    eventArgs: {
        fieldName: string;
        value: any;
    };
}
export declare class Binding extends EventEmitter {
    protected _expression: string;
    private _target;
    static readonly ChangingFieldEventName: string;
    static readonly ChangedFieldEventName: string;
    static readonly ErrorEventName: string;
    constructor(_expression: string, _target: IWatched, register?: boolean);
    formatter: Function;
    readonly expression: string;
    target: IWatched;
    private evaluator;
    onChanging(handler: (ev: EventArgs) => void): void;
    onChanged(handler: (ev: EventArgs) => void, doNotTriggerHandler?: boolean): void;
    onError(handler: (ev: EventArgs) => void): void;
    private registeredBindings;
    pipe(binding: Binding): void;
    getValue(): any;
    register(): void;
    apply(elements: any, doNotRegisterEvents?: boolean): void;
    static getSetter(target: IWatched, expression: string): (value: any, source: any, doNotTriggerEvents?: boolean) => void;
    setValue(value: any, source?: Binding, doNotTriggerEvents?: boolean): void;
}
export declare class PromiseBinding extends Binding {
    constructor(expression: string, target: PromiseLike<any>);
}
export declare class ObservableArray<T> extends EventEmitter {
    array: Array<T>;
    constructor(array: Array<T>);
    readonly length: number;
    push(...items: T[]): void;
    shift(): void;
    pop(): void;
    unshift: (item: any) => void;
    replace(index: any, item: any): void;
    init(): void;
    indexOf(searchElement: T, fromIndex?: number): number;
    toString(): string;
}
export interface ObservableArrayEventArgs<T> {
    action: 'init' | 'push' | 'shift' | 'pop' | 'unshift' | 'replace';
    newItems?: T[];
    oldItems?: T[];
}
export declare class WatchBinding extends Binding {
    constructor(expression: string, target: any, interval: number);
    private lastValue;
    private check();
}
