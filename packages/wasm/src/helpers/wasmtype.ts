import { IsomorphicBuffer } from "@akala/core";
import { u32 } from "../transpilers/wasmtype.js";

/**
 * Core interface for WebAssembly type instances
 * Defines the required methods and properties for any WebAssembly value
 * @template T - The specific type of the instance
 */
export interface wasmtypeInstance<T = unknown>
{
    /**
     * Converts the value to WebAssembly opcodes
     * @returns Buffer containing the opcodes
     */
    toOpCodes(): IsomorphicBuffer;

    /**
     * The WebAssembly type definition for this instance
     */
    type: wasmtype<T>
}

/**
 * Interface defining a WebAssembly type definition
 * Contains the constructor and static members required for a WebAssembly type
 * @template T - The specific type being defined
 */
export interface wasmtype<T>
{
    /**
     * Creates a new instance of the type
     * @param initialOp - Buffer containing initial operations
     */
    new(initialOp: IsomorphicBuffer): T;

    /**
     * Creates an empty instance of the type
     * @returns A new instance with no operations
     */
    pop(): T;

    /**
     * The numeric type code used in WebAssembly
     */
    type: number;
}

/**
 * Namespace containing index types used in WebAssembly
 * All indexes are represented as unsigned 32-bit integers
 */
export namespace indexes
{
    /** Index into the type section */
    export type type = u32
    /** Index into the function section */
    export type func = u32
    /** Index into the table section */
    export type table = u32
    /** Index into the memory section */
    export type memory = u32
    /** Index into the global section */
    export type global = u32
    /** Index into the element section */
    export type elem = u32
    /** Index into the data section */
    export type data = u32
    /** Index for accessing local variables */
    export type local = u32
    /** Index for control flow labels */
    export type label = u32
    /** Index for accessing vector lanes */
    export type lane = u32
}
