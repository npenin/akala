import { Formatter, ReversibleFormatter } from "./common.js";

export default class Json implements Formatter<string>, ReversibleFormatter<string, unknown>
{
    format(value: unknown): string
    {
        return JSON.stringify(value);
    }
    unformat<T>(value: string): T
    {
        return JSON.parse(value);
    }

};