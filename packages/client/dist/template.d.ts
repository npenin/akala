/// <reference types="jquery" />
import 'akala-core';
import * as di from 'akala-core';
export declare class Interpolate {
    private static _startSymbol;
    private static _endSymbol;
    startSymbol: string;
    endSymbol: string;
    private static unescapeText(text);
    private static escape(ch);
    private static escapedStartRegexp;
    private static escapedEndRegexp;
    static build(text: string, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): any;
}
export declare type templateFunction = (target: any, parent: JQuery) => JQuery;
export declare class Template {
    private interpolator;
    private http;
    constructor(interpolator: Interpolate, http: di.Http);
    get(t: string, registerTemplate?: boolean): PromiseLike<templateFunction>;
    static build(markup: string): templateFunction;
}
