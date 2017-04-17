import { Binding } from './binder';
export interface ParsedAny {
    $$length?: number;
}
export declare type ParsedOneOf = ParsedObject | ParsedArray | ParsedFunction | ParsedString | ParsedBoolean | ParsedNumber;
export declare class ParsedBinary implements ParsedAny {
    operator: '+' | '-' | '*' | '/' | '&&' | '||' | '<' | '<=' | '>' | '>=';
    left: ParsedOneOf;
    right: ParsedOneOf;
    constructor(operator: '+' | '-' | '*' | '/' | '&&' | '||' | '<' | '<=' | '>' | '>=', left: ParsedOneOf, right: ParsedOneOf);
    evaluate(value: any, asBinding?: boolean): any;
    $$length: number;
    static applyPrecedence(operation: ParsedBinary): ParsedBinary;
    toString(): string;
}
export interface ParsedObject extends ParsedAny {
    [name: string]: any;
}
export interface ParsedArray extends ParsedAny, Array<ParsedAny> {
}
export interface ParsedFunction extends ParsedAny {
    $$ast?: ParsedBinary;
    (value: any, asBinding?: false): any;
    (value: any, asBinding: true): Binding;
}
export declare class ParsedString implements ParsedAny {
    value: string;
    constructor(value: string);
    $$length: number;
    toString(): string;
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
    static parse(expression: string, excludeFirstLevelFunction: false | undefined): ParsedFunction;
    static parse(expression: string, excludeFirstLevelFunction: true): ParsedOneOf;
    static parse(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedOneOf;
    static parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedOneOf;
    static parseNumber(expression: any): ParsedOneOf;
    static parseBoolean(expression: any): ParsedBoolean;
    static parseEval(expression: string): ParsedBoolean | ParsedFunction | ParsedBinary;
    static parseFunction(expression: string): ParsedFunction;
    static tryParseOperator(expression: string, lhs: ParsedFunction): ParsedFunction;
    static tryParseOperator(expression: string, lhs: ParsedOneOf): ParsedOneOf;
    static parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction;
    static parseString(expression: string, start: string): ParsedOneOf;
    static operate(operator: string, left?: any, right?: any): any;
    private static parseCSV<T>(expression, parseItem, end, output, excludeFirstLevelFunction);
    static parseObject(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedObject;
    static parseBindable(expression: string): string[];
    static getSetter(expression: string, root: any): {
        expression: string;
        target: any;
        set: (value: any) => void;
    };
    static evalAsFunction(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction;
    static eval(expression: string, value: any): any;
}
