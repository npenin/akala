/// <reference types="jquery" />
import { BaseControl } from './control';
import { Binding } from '@akala/core';
import { IScope } from '../scope';
export declare class Click extends BaseControl<Function> {
    constructor();
    link(scope: IScope<any>, element: JQuery, parameter: Binding | Function): void;
}
