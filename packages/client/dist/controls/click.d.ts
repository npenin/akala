/// <reference types="jquery" />
import { BaseControl } from './control';
import { Binding } from 'akala-core';
export declare class Click extends BaseControl<Function> {
    constructor();
    link(target: any, element: JQuery, parameter: Binding | Function): void;
}
