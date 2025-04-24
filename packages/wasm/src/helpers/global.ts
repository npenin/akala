import { IsomorphicBuffer } from '@akala/core';
import { valtype } from './types.js';
import { indexes } from './wasmtype.js'

/**
 * Creates a WebAssembly global type declaration
 * @param val - The value type of the global (i32, i64, f32, f64, etc)
 * @param mut - Whether the global is mutable (true) or immutable (false)
 * @returns Array containing the global type encoding in WebAssembly binary format
 */
export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

/**
 * Helper class for WebAssembly global operations
 * Provides methods for getting and setting global variables
 */
export class global 
{
    /**
     * Private constructor to prevent instantiation
     * This class only provides static methods
     */
    private constructor() { }

    /**
     * Gets the value of a global variable
     * @param value - Index of the global variable in the globals section
     * @returns Buffer containing the get_global instruction and index
     */
    public static get(value: indexes.global) { return new IsomorphicBuffer([0x23, value]); }

    /**
     * Sets the value of a global variable
     * @param value - Index of the global variable in the globals section
     * @returns Buffer containing the set_global instruction and index
     */
    public static set(value: indexes.global) { return new IsomorphicBuffer([0x24, value]); }
}
