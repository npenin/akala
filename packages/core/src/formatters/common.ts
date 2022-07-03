import { Injected, ParsedOneOf } from "..";

export type Formatter<TResult> = Injected<TResult>;// (value: unknown) => TResult;

export interface FormatterFactory<TResult, TSettings = ParsedOneOf>
{
    parse(expression: string): TSettings;
    build(formatter: Formatter<unknown>, settings: TSettings): Formatter<TResult>;
}