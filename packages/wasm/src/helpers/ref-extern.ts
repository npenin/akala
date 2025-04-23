import { IsomorphicBuffer } from '@akala/core';
import { wasmtype, wasmtypeInstance } from './wasmtype.js'


export class externref implements wasmtypeInstance<externref>
{
    public constructor(private internalOps: IsomorphicBuffer) { }
    toOpCodes(): IsomorphicBuffer
    {
        return this.internalOps.subarray(0);
    }
    readonly type: wasmtype<externref> = externref;

    public static pop()
    {
        return new externref(new IsomorphicBuffer(0));
    }

    public static readonly type = 0x6f

}

export const type = externref.type
