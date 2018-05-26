import {  module } from "../helpers";

export function negate(a: any)
{
    return !a;
}

module('$formatters').register('#not', negate);