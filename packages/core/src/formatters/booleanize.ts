import { module } from '../helpers.js';

export function booleanize(a: any)
{
    return !!a;
}

module('$formatters').register('#bool', booleanize);