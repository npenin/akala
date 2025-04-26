import { i32, mergeUInt8Arrays } from './types.js';
import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { table as transpiler } from '../transpilers/table.js'
import { Module } from './module.js';

/**
 * Represents a WebAssembly table
 * Tables are used to store function references or external references that can be accessed dynamically
 * @template T - The type of elements stored in the table
 * @template TNative - The native numeric type (bigint or number) used for memory addresses
 */
export class table<T extends wasmtype<T>, TNative extends bigint | number>
{
    /** Index of the table in the module */
    private readonly index: indexes.table;

    /**
     * Creates a new table instance
     * @param module - The WebAssembly module containing this table
     * @param elementType - The type of elements stored in the table
     */
    public constructor(public readonly module: Module<TNative>, public readonly elementType: T)
    {
        this.index = module.addTable(this);
    }

    public readonly type = table;

    /**
     * Gets an element from the table
     * @param elementIndex - Index of the element to retrieve
     * @returns A new instance of the element type containing the get operation
     */
    public get(elementIndex: i32) { return new this.elementType(mergeUInt8Arrays(elementIndex.toOpCodes(), [transpiler.get, this.index])); }

    /**
     * Sets an element in the table
     * @param elementIndex - Index where to store the element
     * @param value - Value to store
     * @returns Buffer containing the set operation
     */
    public set<U extends wasmtypeInstance<U>>(elementIndex: i32, value: U) { return mergeUInt8Arrays(value.toOpCodes(), elementIndex.toOpCodes(), [transpiler.set, this.index]) }

    // The following operations are commented out but would represent additional table operations
    // init, elem_drop, copy, grow, size, and fill operations can be implemented when needed
}
