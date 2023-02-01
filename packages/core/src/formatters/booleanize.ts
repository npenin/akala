import { module } from '../helpers.js';

export function booleanize(a: unknown)
{
    return !!a;
}

module('$formatters').register('#bool', booleanize);