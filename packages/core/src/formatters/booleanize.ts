import { module } from '../helpers';

export function booleanize(a: unknown)
{
    return !!a;
}

module('$formatters').register('#bool', booleanize);