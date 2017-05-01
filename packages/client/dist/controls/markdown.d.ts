/// <reference types="jquery" />
import { Binding } from '@akala/core';
import { Text } from './text';
export declare class Markdown extends Text {
    constructor();
    private markdown;
    link(target: any, element: JQuery, parameter: Binding | string): void;
    protected setValue(element: JQuery, value: any): void;
}
