import { valtype } from './types.js';
import { indexes, wasmtypeInstance } from './wasmtype.js'

export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

export class global 
{
    private constructor() { }

    public static get(value: indexes.global) { return new Uint8Array([0x23, value]); }
    public static set(value: indexes.global) { return new Uint8Array([0x24, value]); }
}