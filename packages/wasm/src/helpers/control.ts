import { uint8 } from '@akala/protocol-parser';
import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { control as transpiler } from '../transpilers/control.js'
import { table } from './table.js';
import { func, i32, mergeUInt8Arrays, valtype } from './types.js';
import { local } from './local.js';
import { Module } from './module.js';
import { parameters } from './func.js';



export class control 
{
    protected constructor(private initialOp: Uint8Array) { }
    public toOpCodes(): Uint8Array
    {
        return this.initialOp.slice(0);
    }

    public static readonly transpiler = transpiler;

    public static block<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T, instr: Uint8Array): U
    public static block(blocktype: undefined, instr: Uint8Array): control
    public static block<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T | undefined, instr: Uint8Array): U | control
    {
        if (!blocktype)
            return new control(mergeUInt8Arrays(
                [transpiler.empty_block],
                instr,
                [transpiler.end],
            ));
        return new control(mergeUInt8Arrays(
            [blocktype.type],
            instr,
            [transpiler.end],
        ));
    }

    public static loop(blocktype: undefined, instr: Uint8Array): control
    public static loop<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T, instr: Uint8Array): U
    public static loop<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T | undefined, instr: Uint8Array): U | control
    {
        if (!blocktype)
            return new control(mergeUInt8Arrays(
                [transpiler.loop, transpiler.empty_block],
                instr,
                [transpiler.end],
            )
            );
        return new blocktype(mergeUInt8Arrays([transpiler.loop, blocktype.type], instr,
            [transpiler.end],
        ));
    }

    public static while(condition: Uint8Array, instr: Uint8Array): control
    {
        return control.loop(undefined, mergeUInt8Arrays(condition, [transpiler.br_if, 0], instr));
    }


    public static for(init: Uint8Array, condition: i32, increment: Uint8Array, instr: Uint8Array): control
    {
        return new control(mergeUInt8Arrays(
            init,
            [transpiler.loop, transpiler.empty_block],
            condition.toOpCodes(),
            [transpiler.br_if, 0],
            instr,
            increment,
            [transpiler.end],
        )
        );
    }


    public static if(blocktype: undefined, condition: i32, instr: Uint8Array): control
    public static if<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T, condition: i32, instr: Uint8Array): U
    public static if<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T | undefined, condition: i32, instr: Uint8Array): U | control
    {
        if (!blocktype)
            return new control(mergeUInt8Arrays(
                condition.toOpCodes(),
                [transpiler.if, transpiler.empty_block],
                instr,
                [transpiler.end],
            )
            );
        return new blocktype(mergeUInt8Arrays(condition.toOpCodes(), [transpiler.if, blocktype.type], instr,
            [transpiler.end],
        ));
    }


    public static ifelse(blocktype: undefined, condition: i32, instr: Uint8Array, Else: Uint8Array): control
    public static ifelse<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T, condition: i32, instr: Uint8Array, Else: Uint8Array): U
    public static ifelse<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(blocktype: T | undefined, condition: i32, instr: Uint8Array, Else: Uint8Array): U | control
    {
        if (!blocktype)
            return new control(mergeUInt8Arrays(
                condition.toOpCodes(),
                [transpiler.if, transpiler.empty_block],
                instr,
                [transpiler.else],
                Else,
                [transpiler.end],
            )
            );
        return new blocktype(mergeUInt8Arrays(
            condition.toOpCodes(),
            [transpiler.if, blocktype.type],
            instr,
            [transpiler.else],
            Else,
            [transpiler.end],
        ));
    }

    // public static br(label: indexes.label) { return new control(transpiler.br(label)) }
    // public static br_if<U extends wasmtypeInstance<U>>(blockType: U, label: indexes.label) { return new control([...blockType.toOpCodes(), ...transpiler.br_if(label)]) }
    // public static br_table<T extends wasmtype<U>, U extends wasmtypeInstance<U>>(table: table<T, U>, defaultLabel: indexes.label, ...labels: indexes.label[]) { return new control([...table.toOpCodes(), ...transpiler.br_table(defaultLabel, ...labels)]); }
    public static call<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[], TNative extends bigint | number>(module: Module<TNative>, func: func<T, U>, ...args: parameters<T>): Uint8Array
    {
        return mergeUInt8Arrays(...args.flatMap(a => a.toOpCodes()), [transpiler.call, module.indexOfFunc(func)]);
    }
    // public static call_indirect(type: indexes.type, table: indexes.table) { return [0x11, type, table]; }
}