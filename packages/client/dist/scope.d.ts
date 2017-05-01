import * as di from '@akala/core';
export interface IScope<T> extends di.IWatched {
    $new<U>(): IScope<U>;
    $set<U extends keyof T>(expression: U | string, value: T[U] | any): any;
    $watch(expression: string, handler: (value: any) => void): any;
    $inject(f: Function): any;
}
export declare class Scope<T> implements IScope<T> {
    constructor();
    private resolver;
    $$watchers: {
        [key: string]: di.Binding;
    };
    $new<U>(): Scope<U>;
    $inject(f: Function): any;
    $set(expression: string, value: any): void;
    $watch(expression: string, handler: (value: any) => void): void;
}
