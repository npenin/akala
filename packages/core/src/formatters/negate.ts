import { register } from "..";

export function negate(a: any)
{
    return !a;
}

register('#not', negate);