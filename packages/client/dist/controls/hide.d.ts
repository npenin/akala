/// <reference types="jquery" />
import * as di from '@akala/core';
import { BaseControl } from './control';
export declare class Hide extends BaseControl<di.Binding> {
    constructor();
    link(target: any, element: JQuery, parameter: di.Binding): void;
}
