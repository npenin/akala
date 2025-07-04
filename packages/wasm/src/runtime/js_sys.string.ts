import { Module } from '../helpers/module.js'
import { externref, i32 } from '../helpers/types.js'
import { MarshalledArray } from './js_sys.Array.js'
import * as jssys from './js_sys.js'
import { JsModule, Marshall, Marshalled } from './js_sys.module.js'

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

export const glue = ['startsWith', 'endsWith', 'includes', 'indexOf', 'toLowerCase', 'toUpperCase', 'trim'] as const;

export type StringJsModule = Record<typeof glue[number], { pointer: jssys.Pointer, ref: externref }>;

export default class MarshalledString<TNative extends number | bigint> extends Marshalled<TNative>
{
    private static registered = new WeakMap<Module<number | bigint>, StringJsModule>();
    private readonly selfModule: StringJsModule;

    constructor(value: Marshall<TNative>)
    {
        super(value)
        if (!MarshalledString.registered.has(value.module))
            this.selfModule = MarshalledString.register(value.module, value.jsModule);
        else
            this.selfModule = MarshalledString.registered.get(value.module);
    }

    static register<TNative extends number | bigint>(module: Module<TNative>, jsModule: JsModule<TNative>): StringJsModule
    {
        const stringPointer = jssys.toPointer(String)[0] as number;
        const result = Object.fromEntries(glue.map(element =>
        {
            const pointer = jssys.toPointer(element, stringPointer);
            return [element, { pointer, ref: jsModule.heap.get(module.usize.const(pointer[0] as TNative)) }];
        })) as StringJsModule;
        this.registered.set(module, result);
        return result;
    }

    public startsWith(s: MarshalledString<TNative>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.address,
            this.selfModule.startsWith.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [s.address]).address,
        );
    }

    public endsWith(s: MarshalledString<TNative>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.address,
            this.selfModule.endsWith.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [s.address]).address,
        );
    }

    public includes(s: MarshalledString<TNative>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.address,
            this.selfModule.includes.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [s.address]).address,
        );
    }

    public indexOf(s: MarshalledString<TNative>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.address,
            this.selfModule.indexOf.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [s.address]).address,
        );
    }

    // For methods with no arguments, like toLowerCase, toUpperCase, trim:
    public toLowerCase(): MarshalledString<TNative>
    {
        return new MarshalledString(
            Marshall.from(this.value,
                this.value.jsModule.callMethod(
                    this.address,
                    this.selfModule.toLowerCase.ref,
                    this.value.jsModule.EmptyArray,
                )));
    }

    public toUpperCase(): MarshalledString<TNative>
    {
        return new MarshalledString(
            Marshall.from(this.value,
                this.value.jsModule.callMethod(
                    this.address,
                    this.selfModule.toUpperCase.ref,
                    this.value.jsModule.EmptyArray,
                )));
    }

    public trim(): MarshalledString<TNative>
    {
        return new MarshalledString(
            Marshall.from(this.value,
                this.value.jsModule.callMethod(
                    this.address,
                    this.selfModule.trim.ref,
                    this.value.jsModule.EmptyArray,
                )));
    }
}
