import { module } from '../helpers.js';

export function negate(a: unknown)
{
    return !a;
}

module('$formatters').register('#not', negate);