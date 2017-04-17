/// <reference types="jquery" />
import * as di from '@akala/core';
import { Control } from './control';
import { Scope } from '../scope';
export interface parameter {
    in: di.Binding | di.ObservableArray<any>;
    text: di.Binding | string;
    value: di.Binding | string;
}
export declare class Options extends Control<parameter> {
    constructor();
    instanciate(target: Scope, element: JQuery, parameter: parameter, controls: any): void;
}
