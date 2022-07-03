import { module } from '../helpers';

export function negate(a: unknown)
{
    return !a;
}

module('$formatters').register('#not', negate);