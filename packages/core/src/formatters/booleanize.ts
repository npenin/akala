import { Formatter } from "./common.js";

export default class Booleanize implements Formatter<boolean>
{
    static readonly instance = new Booleanize();

    format(a: unknown)
    {
        return !!a;
    }
}