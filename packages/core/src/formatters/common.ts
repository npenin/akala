import { Injected } from "../injector";
import { ParsedOneOf } from "../parser/parser";

export type Formatter<TResult> = Injected<TResult>;// (value: unknown) => TResult;

export interface FormatterFactory<TResult, TSettings = ParsedOneOf>
{
    parse(expression: string): TSettings;
    build(settings: TSettings): Formatter<TResult>;
}