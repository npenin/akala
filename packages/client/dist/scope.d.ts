import * as di from '@akala/core';
export interface IScope extends di.IWatched {
    $new(): IScope;
    $set(expression: string, value: any): any;
    $watch(expression: string, handler: (value: any) => void): any;
}
export declare class Scope implements IScope {
    constructor();
    private $watchers;
    $new(): Scope;
    $set(expression: string, value: any): void;
    $watch(expression: string, handler: (value: any) => void): void;
}
