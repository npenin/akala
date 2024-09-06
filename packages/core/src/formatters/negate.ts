import { Formatter } from "./common.js";

export default class Negate implements Formatter<boolean>
{
    static readonly instance = new Negate();

    format<T>(value: T): boolean
    {
        return !value;
    }

};