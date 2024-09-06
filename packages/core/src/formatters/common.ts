import { ParsedOneOf } from "../parser/parser.js";

// export type Formatter<TResult> = (value: unknown) => TResult;
// export type ReversibleFormatter<TResult, TOrigin> = Injected<TResult & { reverse: (value: TResult) => TOrigin }>;

export interface Formatter<TResult>
{
    format(value: unknown): TResult;
}

export interface ReversibleFormatter<TResult, TOrigin> extends Formatter<TResult>
{
    unformat(value: TResult): TOrigin;
}

export interface FormatterFactory<TResult, TSettings = ParsedOneOf>
{
    parse(expression: string): TSettings;
    build(settings: TSettings): Formatter<TResult>;
}