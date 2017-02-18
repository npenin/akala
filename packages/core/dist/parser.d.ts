import { Binding } from './binder';
export interface ParsedAny {
    $$length?: number;
}
export interface ParsedObject extends ParsedAny {
    [name: string]: any;
}
export interface ParsedArray extends ParsedAny, Array<ParsedAny> {
}
export interface ParsedFunction extends ParsedAny {
    (value: any, asBinding?: false): any;
    (value: any, asBinding: true): Binding;
}
export declare class ParsedString implements ParsedAny {
    value: string;
    constructor(value: string);
    $$length: number;
}
export declare class Parser {
    static parse(expression: string, excludeFirstLevelFunction: boolean): ParsedFunction | ParsedAny;
    static parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedAny;
    static parseEval(expression: string): ParsedFunction;
    static parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction;
    static parseString(expression: string, start: string): ParsedString;
    private static parseCSV<T>(expression, onItem, end, output, excludeFirstLevelFunction);
    static parseObject(expression: string, excludeFirstLevelFunction?: boolean): ParsedObject | ParsedFunction;
    static parseBindable(expression: string): string[];
    static getSetter(expression: string, root: any): {
        expression: string;
        target: any;
        set: (value: any) => void;
    };
    static evalAsFunction(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction;
    static eval(expression: string, value: any): any;
}
