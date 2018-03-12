import { register } from "..";

export function booleanize(a: any)
{
    return !!a;
}

register('#bool', booleanize);