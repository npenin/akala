import { Control } from './control';
import { Scope } from '../scope';
export declare class ForEach extends Control<any> {
    constructor();
    instanciate(target: Scope, element: JQuery, parameter: any): PromiseLike<JQuery>;
    private static expRegex;
    private parse(exp);
}
