import { wasmtype, wasmtypeInstance } from './wasmtype.js'


export class externref implements wasmtypeInstance<externref>
{
    public constructor(private internalOps: Uint8Array) { }
    toOpCodes(): Uint8Array
    {
        return this.internalOps.slice(0);
    }
    readonly type: wasmtype<externref> = externref;

    public static pop()
    {
        return new externref(new Uint8Array());
    }

    public static readonly type = 0x6f

}

export const type = externref.type