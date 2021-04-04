import { ParsedObject } from "..";

export type Formatter<TResult> = (value: any) => TResult;

export interface FormatterFactory<TResult, TSettings>
{
    parse(expression: string): ParsedObject & TSettings;
    build(Formatter: Formatter<any>, settings: TSettings): Formatter<TResult>;
}