import { IsomorphicBuffer } from '@akala/core';
import { local } from '../helpers/local.js';
import { usize } from '../helpers/memory.js';
import { Module } from '../helpers/module.js'
import { table } from '../helpers/table.js';
import { externref, f32, f64, i32, i64 } from '../helpers/types.js'
import { indexes } from '../helpers/wasmtype.js';
import * as jssys from './js_sys.js'

export const JsTypes = {
    bigint: i32.const(jssys.Types.bigint),
    boolean: i32.const(jssys.Types.boolean),
    function: i32.const(jssys.Types.function),
    number: i32.const(jssys.Types.number),
    object: i32.const(jssys.Types.object),
    string: i32.const(jssys.Types.string),
    symbol: i32.const(jssys.Types.symbol),
    undefined: i32.const(jssys.Types.undefined),
}
export type wasmPointer<TNative extends bigint | number> = [usize<TNative>, i32]

export function wasmPointer<TNative extends bigint | number>(index: usize<TNative>, type: i32): wasmPointer<TNative>
{
    return [index, type]
}

export type JsModule<TNative extends number | bigint> = ReturnType<typeof JsModule<TNative>>;

export function JsModule<TNative extends number | bigint>(module: Module<TNative>, jssysName: string = 'js-sys')
{
    const heap = new table(module, externref, 8);
    const array = module.importFunc(jssysName, Array.name, [i32], [externref]);
    return {
        moduleName: jssysName,
        newObject: module.importFunc(jssysName, jssys.newObject.name, [], [externref]),
        new: module.importFunc(jssysName, jssys.newObject.name, [module.usize, module.usize], [externref]),
        dropObject: module.importFunc(jssysName, jssys.dropObject.name, [externref], []),
        getProperty: module.importFunc(jssysName, jssys.getProperty.name, [externref, externref], [externref]),
        geti32Property: module.importFunc(jssysName, jssys.getProperty.name, [externref, i32], [externref]),
        getPropertyi32: module.importFunc(jssysName, jssys.getProperty.name, [externref, externref], [i32]),
        setProperty: module.importFunc(jssysName, jssys.setProperty.name, [externref, externref, externref], []),
        seti32Property: module.importFunc(jssysName, jssys.setProperty.name, [externref, i32, externref], []),
        seti32Propertyi32: module.importFunc(jssysName, jssys.setProperty.name, [externref, i32, i32], []),
        callMethod: module.importFunc(jssysName, jssys.callMethod.name, [externref, externref, externref], [externref]),
        callMethodi32: module.importFunc(jssysName, jssys.callMethod.name, [externref, externref, externref], [i32]),
        callFunction: module.importFunc(jssysName, jssys.callFunction.name, [externref, externref], [externref]),
        callFunctioni32: module.importFunc(jssysName, jssys.callFunction.name, [externref, externref], [i32]),
        unmarshalli32: module.importFunc(jssysName, jssys.unmarshall.name, [externref], [i32]),
        unmarshalli64: module.importFunc(jssysName, jssys.unmarshall64.name, [externref], [i64]),
        unmarshallf32: module.importFunc(jssysName, jssys.unmarshall.name, [externref], [f32]),
        unmarshallf64: module.importFunc(jssysName, jssys.unmarshall.name, [externref], [f64]),
        // marshall: [
        //     r => r.toOpCodes(),
        //     t => control.switch(t, [
        //         { code: JsTypes.bigint.toOpCodes() },
        //         { code: JsTypes.boolean.toOpCodes() },
        //         { code: JsTypes.function.toOpCodes() },
        //         { code: JsTypes.number.toOpCodes() },
        //         { code: JsTypes.object.toOpCodes() },
        //         { code: JsTypes.string.toOpCodes() },
        //         { code: JsTypes.symbol.toOpCodes() },
        //         { code: JsTypes.undefined.toOpCodes() }
        //     ]).toOpCodes()
        // ] as ResultHandlers<[usizeType<TNative>, typeof i32]>,
        heap,
        global: heap.get(module.usize.const(2)),
        Array: array,
        EmptyArray: heap.get(module.usize.const(3)),
    }
}

export function provideJsModule(jssysName: string = 'js-sys')
{
    return {
        newObject() { return jssys.newObject(); },
        new(type: number, args: number) { return jssys.newObject([type, jssys.Types.function], jssys.fromPointer([args, jssys.Types.object])) },
        dropObject(ref: number, depth: number) { return jssys.dropObject(ref, depth); },
        getProperty(source: number, sourceType: number, prop: number, propType: number)
        {
            return jssys.getProperty([source, sourceType], [prop, propType]);
        },
        setProperty(source: number, sourceType: number, prop: number, propType: number, value: number, valueType: number)
        {
            return jssys.setProperty([source, sourceType], [prop, propType], [value, valueType]);
        },
        callMethod(source: number, sourceType: number, method: number, methodType: number, args: number, argsType: number)
        {
            return jssys.callMethod([source, sourceType], [method, methodType], [args, argsType])
        },
        Array(length: number)
        {
            return jssys.newObject(jssys.toPointer(Array), [length, jssys.Types.number])
        },
        EmptyArray: []
    }
}

export class Marshalled<TNative extends bigint | number>
{
    constructor(protected value: Marshall<TNative>) { }

    public get address() { return this.value.address; }
}

export type RefPointer<TNative extends bigint | number> = Marshall<TNative>;

export class Marshall<TNative extends bigint | number>
{
    static from<TNative extends bigint | number>(value: Marshall<TNative>, address: externref): Marshall<TNative>
    {
        return new Marshall(value.module, value.jsModule, address, value.type);
    }

    public readonly address: externref
    public readonly local?: local<externref>;

    constructor(public readonly module: Module<TNative>, public readonly jsModule: JsModule<TNative>, init: indexes.local | externref, public readonly type: i32)
    {
        if (typeof init == 'number')
            this.address = (this.local = new local(init, externref)).get();
        else if (init instanceof IsomorphicBuffer)
        {

        }
        else
            // if (!sl)
            this.address = init;
        // else
        //   this.address = head_list_address(index as i32, sl);
    }

    // public get externref() { return this.jsModule.heap.get(this.address) }
}
