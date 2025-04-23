import { wasmtype } from './wasmtype.js'


export class externref implements wasmtype<externref>
{
    private constructor() { }

    public static readonly type = 0x6f


}

export const type = externref.type