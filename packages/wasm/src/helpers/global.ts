import { IsomorphicBuffer } from '@akala/core';
import { valtype } from './types.js';
import { indexes } from './wasmtype.js'

export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

export class global 
{
    private constructor() { }

    public static get(value: indexes.global) { return new IsomorphicBuffer([0x23, value]); }
    public static set(value: indexes.global) { return new IsomorphicBuffer([0x24, value]); }
}
