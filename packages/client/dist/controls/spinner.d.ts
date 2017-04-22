/// <reference types="jquery" />
import { Control } from './control';
import { Binding } from '@akala/core';
import { IScope } from '../scope';
export declare class Spinner extends Control<any> {
    constructor();
    instanciate(target: IScope<any>, element: JQuery, parameter: Binding | any): JQuery | PromiseLike<JQuery>;
}
