import { IsomorphicBuffer } from '@akala/core';
import { wasmtype, wasmtypeInstance } from './wasmtype.js'


/**
 * Represents an external reference type in WebAssembly
 * Used for referencing values that exist outside the WebAssembly instance
 */
export class externref implements wasmtypeInstance<externref>
{
    /**
     * Creates a new external reference instance
     * @param internalOps - Buffer containing the operations
     */
    public constructor(private internalOps: IsomorphicBuffer) { }

    /**
     * Converts the external reference to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    toOpCodes(): IsomorphicBuffer
    {
        return this.internalOps.subarray(0);
    }

    readonly type: wasmtype<externref> = externref;

    /**
     * Creates an empty external reference instance
     * @returns A new externref instance with empty operation buffer
     */
    public static pop()
    {
        return new externref(new IsomorphicBuffer(0));
    }

    /** WebAssembly type code for externref */
    public static readonly type = 0x6f
}

/** Export the externref type code */
export const type = externref.type
