/// <reference types="jquery" />
import * as di from '@akala/core';
import { Control } from './control';
import { IScope } from '../scope';
export interface ForeachParameter {
    in: di.ParsedFunction;
    key: string;
    value: string;
}
export declare class ForEach extends Control<ForeachParameter | string> {
    constructor(name?: string);
    instanciate(target: IScope<any>, element: JQuery, parameter: ForeachParameter | string): PromiseLike<JQuery>;
    private static expRegex;
    protected parse(exp: string): ForeachParameter;
}
