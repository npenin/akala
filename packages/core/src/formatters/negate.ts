import { module } from '../helpers.js';

export function negate(a: any)
{
    return !a;
}

module('$formatters').register('#not', negate);