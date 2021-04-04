import { module } from "../helpers";

export function booleanize(a: any)
{
    return !!a;
}

module('$formatters').register('#bool', booleanize);