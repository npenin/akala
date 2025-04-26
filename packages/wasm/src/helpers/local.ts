import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { local as transpiler } from '../transpilers/local.js'
import { mergeUInt8Arrays } from './types.js';
import { IsomorphicBuffer } from '@akala/core';

// export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

/**
 * Represents a local variable in WebAssembly
 * @template T - The type of the local variable
 */
export class local<T extends wasmtypeInstance<T>>
{
    /**
     * Creates a new local variable
     * @param index - The index of the local variable
     * @param type - The WebAssembly type of the local variable
     */
    public constructor(public readonly index: indexes.local, public readonly type: wasmtype<T>) { }

    /**
     * Gets the value of the local variable
     * @returns A new instance of type T containing the get operation
     */
    public get(): T { return new this.type(new IsomorphicBuffer([transpiler.get, this.index])); }

    /**
     * Sets the value of the local variable
     * @param value - The value to set
     * @returns Buffer containing the set operation
     */
    public set(value: T) { return mergeUInt8Arrays(value.toOpCodes(), [transpiler.set, this.index]) }

    /**
     * Sets the value and returns it (like tee in a pipeline)
     * @param value - The value to set
     * @returns A new instance of type T containing both the value and tee operation
     */
    public tee(value: T): T { return new this.type(mergeUInt8Arrays(value.toOpCodes(), [transpiler.tee, this.index])) }
}
