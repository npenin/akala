import { Binding } from './binder';
export interface ParsedAny {
    $$length?: number;
}
export declare type ParsedOneOf = ParsedObject | ParsedArray | ParsedFunction | ParsedString | ParsedBoolean | ParsedNumber;
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
export declare class ParsedNumber implements ParsedAny {
    constructor(value: string);
    value: number;
    $$length: number;
}
export declare class ParsedBoolean implements ParsedAny {
    constructor(value: string);
    value: boolean;
    $$length: number;
}
export declare class Parser {
    static parse(expression: string, excludeFirstLevelFunction: boolean): ParsedFunction | ParsedAny;
    static parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedOneOf;
    static parseNumber(expression: any): ParsedNumber;
    static parseBoolean(expression: any): ParsedBoolean;
    static parseEval(expression: string): ParsedBoolean | ParsedFunction;
    private static parseFunction(expression);
    static tryParseOperator(expression: string, lhs: ParsedOneOf): boolean | ParsedObject;
    static parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction;
    static parseString(expression: string, start: string): ParsedString;
    static operate(operator: string, left?: any, right?: any): boolean;
    private static parseCSV<T>(expression, parseItem, end, output, excludeFirstLevelFunction);
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
