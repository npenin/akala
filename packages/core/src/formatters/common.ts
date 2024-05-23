import { Injected } from "../injectors/shared.js";
import { ParsedOneOf } from "../parser/parser.js";

export type Formatter<TResult> = Injected<TResult>;// (value: unknown) => TResult;
export type ReversibleFormatter<TResult, TOrigin> = Injected<TResult & { reverse: (value: TResult) => TOrigin }>;// (value: unknown) => TResult;

export interface FormatterFactory<TResult, TSettings = ParsedOneOf>
{
    parse(expression: string): TSettings;
    build(settings: TSettings): Formatter<TResult>;
}