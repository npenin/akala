/// <reference types="jquery" />
import * as di from '@akala/core';
import { BaseControl } from './control';
import { Binding } from '@akala/core';
export declare class Translate extends BaseControl<string> {
    private translator;
    constructor(translator: di.Translator);
    link(target: any, element: JQuery, parameter: Binding | string): void;
}
