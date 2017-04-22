/// <reference types="jquery" />
import { Control } from './control';
import { IScope } from '../scope';
export declare class ForEach extends Control<any> {
    constructor();
    instanciate(target: IScope<any>, element: JQuery, parameter: any): PromiseLike<JQuery>;
    private static expRegex;
    private parse(exp);
}
