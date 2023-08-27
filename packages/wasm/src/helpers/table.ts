import { memarg, memory } from './memory.js';
import { i32, mergeUInt8Arrays, valtype } from './types.js';
import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { table as transpiler } from '../transpilers/table.js'
import { Module } from './module.js';

export class table<T extends wasmtype<T>, TNative extends bigint | number>
{
    private readonly index: indexes.table;

    public constructor(public readonly module: Module<TNative>, public readonly elementType: T, private readonly limit: memarg<TNative>)
    {
        this.index = module.addTable(this);
    }

    public readonly type = table;

    public get(elementIndex: i32) { return new this.elementType(mergeUInt8Arrays(elementIndex.toOpCodes(), [transpiler.get, this.index])); }
    public set<U extends wasmtypeInstance<U>>(elementIndex: i32, value: U) { return mergeUInt8Arrays(value.toOpCodes(), elementIndex.toOpCodes(), [transpiler.set, this.index]) }
    // public init(x: indexes.table, y: indexes.table) { return [0xfc, 12, y, x]; }
    // public elem_drop(x: indexes.elem) { return [0xfc, 13, x]; }
    // public copy(x: indexes.table, y: indexes.table) { return [0xfc, 14, x, y]; }
    // public grow(x: indexes.table) { return [0xfc, 15, x]; }
    // public size(x: indexes.table) { return [0xfc, 16, x]; }
    // public fill(x: indexes.table) { return [0xfc, 17, x]; }


}