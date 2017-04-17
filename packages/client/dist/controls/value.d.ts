/// <reference types="jquery" />
import * as di from '@akala/core';
import { BaseControl } from './control';
export declare class Value extends BaseControl<string> {
    constructor();
    link(target: any, element: JQuery, parameter: di.Binding | string): void;
}
