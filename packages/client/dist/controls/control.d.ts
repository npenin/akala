import * as di from 'akala-core';
import { Scope } from '../scope';
export declare function control(...toInject: string[]): (ctrl: new (...args: any[]) => any) => void;
export declare abstract class Control<T> implements IControl {
    private $$name;
    priority: number;
    static injector: di.Module;
    constructor($$name: string, priority?: number);
    static apply(controls: any, element: JQuery, scope?: any): JQuery | PromiseLike<JQuery>;
    protected clone(element: JQuery, scope: Scope, newControls?: any): JQuery;
    abstract instanciate(target: any, element: JQuery, parameter: di.Binding | T): void | JQuery | PromiseLike<JQuery>;
    scope?: any | boolean;
}
export declare abstract class BaseControl<T> extends Control<T> {
    constructor(name: string, priority?: number);
    abstract link(target: any, element: JQuery, parameter: di.Binding | T): any;
    instanciate(target: any, element: JQuery, parameter: di.Binding | T): void | JQuery;
}
export interface IControl {
    priority: number;
    instanciate(scope: Scope, element: JQuery, parameter: any): any;
}
