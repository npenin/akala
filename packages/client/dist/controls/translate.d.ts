/// <reference types="jquery" />
import * as di from '@akala/core';
import { Text } from './text';
export declare class Translate extends Text {
    private translator;
    constructor(translator: di.Translator);
    protected setValue(element: JQuery, value: any): void;
}
