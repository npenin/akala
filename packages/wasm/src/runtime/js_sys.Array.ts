import { ErrorWithStatus, HttpStatusCode } from '@akala/core';
import { control } from '../helpers/control.js';
import { local } from '../helpers/local.js';
import { usizeType } from '../helpers/memory.js';
import { ImportedFunc, Module } from '../helpers/module.js'
import { externref, func, i32, mergeUInt8Arrays } from '../helpers/types.js'
import { wasmtypeInstance } from '../helpers/wasmtype.js';
import * as jssys from './js_sys.js'
import { JsModule, JsTypes, Marshall, Marshalled } from './js_sys.module.js'

export const glue = ['slice', 'push', 'pop', 'shift', 'unshift', 'indexOf', 'includes', 'join', 'concat', 'reverse', 'Array', 'length'] as const;


export type ArrayJsModule<TNative extends number | bigint> = Record<typeof glue[number], { pointer: jssys.Pointer, ref: externref }> & {
    Array: ImportedFunc<[typeof i32], [usizeType<TNative>, typeof i32]>
};

export class MarshalledArray<TNative extends number | bigint> extends Marshalled<TNative>
{
    private static registered = new WeakMap<Module<number | bigint>, ArrayJsModule<number | bigint>>();
    private readonly selfModule: ArrayJsModule<TNative>;

    constructor(value: Marshall<TNative>)
    {
        super(value);
        this.selfModule = MarshalledArray.register(value.module, value.jsModule);
    }

    static new<TNative extends number | bigint>(module: Module<TNative>, jsModule: JsModule<TNative>, length: number): MarshalledArray<TNative>
    {
        let selfModule: ArrayJsModule<TNative>;
        if (!MarshalledArray.registered.has(module))
            selfModule = MarshalledArray.register(module, jsModule);
        else
            selfModule = MarshalledArray.registered.get(module);

        return new MarshalledArray(new Marshall(module, jsModule, new externref(module.callImportedFunc(selfModule.Array, [i32.const(length)], [r => r.toOpCodes(), t => control.drop(t)])), JsTypes.object));

    }

    static register<TNative extends number | bigint>(module: Module<TNative>, jsModule: JsModule<TNative>): ArrayJsModule<TNative>
    {
        if (MarshalledArray.registered.has(module))
            return MarshalledArray.registered.get(module);

        const arrayPointer = jssys.toPointer(Array)[0] as number;
        const result = Object.fromEntries(glue.map(element =>
        {
            const pointer = jssys.toPointer(element, arrayPointer);
            return [element, { pointer, ref: jsModule.heap.get(module.usize.const(pointer[0] as TNative)) }];
        })) as Partial<ArrayJsModule<TNative>>;

        Object.assign(result.Array, module.importFunc(jsModule.moduleName, Array.name, [i32], [module.usize, i32]));

        this.registered.set(module, result as ArrayJsModule<TNative>);
        return result as ArrayJsModule<TNative>;
    }

    public length()
    {
        return this.value.jsModule.getPropertyi32(
            this.value.address,
            this.selfModule.length.ref);
    }

    public getAt(index: i32)
    {
        return this.value.jsModule.geti32Property(this.value.address, index);
    }

    public slice(start: i32, end: i32)
    {
        return new MarshalledArray(Marshall.from(this.value, new externref(this.value.jsModule.callMethod.call([this.value.address, this.selfModule.slice.ref, MarshalledArray.from(this.value.module, this.value.jsModule, [start, end]).value.address], [ref => ref.toOpCodes()]))));
    }
    static from<TNative extends bigint | number>(module: Module<TNative>, jsModule: JsModule<TNative>, values: wasmtypeInstance<any>[])
    {
        let selfModule: ArrayJsModule<TNative>;
        if (!MarshalledArray.registered.has(module))
            selfModule = MarshalledArray.register(module, jsModule);
        else
            selfModule = MarshalledArray.registered.get(module);

        if (selfModule[`ArrayOf${values.length}${values.map(v => v.type.type).join('-')}`])
            return new MarshalledArray(new Marshall(module, jsModule, new externref(module.call(selfModule[`ArrayOf${values.length}`], values, [r => r.toOpCodes()])), JsTypes.object));

        const locals = values.map((value, i) => new local(i, value.type));
        const array = new local(values.length, externref);
        const f = func.new(locals, [externref], [array],
            mergeUInt8Arrays(
                array.set(MarshalledArray.new(module, jsModule, values.length).address),
                ...locals.map((local, index) =>
                {
                    switch (local.type)
                    {
                        case i32:
                            return jsModule.seti32Propertyi32.call([array.get(), i32.const(index), local.get()], []);
                        case externref:
                            return jsModule.seti32Property.call([array.get(), i32.const(index), local.get()], []);
                        default:
                            throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'types other than i32 and externref are not (yet) supported');

                    }
                }),
                array.get().toOpCodes(),
                [control.transpiler.return]
            )
        );

        return new MarshalledArray(new Marshall(module, jsModule, new externref(module.call(f, values, [r => r.toOpCodes()])), JsTypes.object));
    }

    public push(...items: externref[]): i32
    {
        // Assumes items are MarshalledArray or compatible; adjust as needed for your value marshalling
        return new i32(this.value.jsModule.callMethod.call([
            this.value.address,
            this.selfModule.push.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, items).value.address,
        ],
            [
                r => this.value.jsModule.unmarshalli32.call([r], [i => i.toOpCodes()]),
            ])
        );
    }

    public pop(): externref
    {
        return new externref(this.value.jsModule.callMethod.call([
            this.value.address,
            this.selfModule.pop.ref,
            this.value.jsModule.EmptyArray,
        ], [ref => ref.toOpCodes()]));
    }

    public shift(): externref
    {
        return new externref(this.value.jsModule.callMethod.call([
            this.value.address,
            this.selfModule.shift.ref,
            this.value.jsModule.EmptyArray,
        ], [ref => ref.toOpCodes()]));
    }

    public unshift(...items: wasmtypeInstance<any>[]): i32
    {
        return new i32(this.value.jsModule.callMethod.call([
            this.value.address,
            this.selfModule.unshift.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, items).value.address,
        ],
            [
                r => this.value.jsModule.unmarshalli32.call([r], [r => r.toOpCodes()]),
            ])
        );
    }

    public indexOf(item: wasmtypeInstance<any>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.value.address,
            this.selfModule.indexOf.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [item]).value.address,
        );
    }

    public includes(item: wasmtypeInstance<any>): i32
    {
        return this.value.jsModule.callMethodi32(
            this.value.address,
            this.selfModule.includes.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [item]).value.address,
        );
    }

    public join(separator: externref): externref
    {
        return this.value.jsModule.callMethod(
            this.value.address,
            this.selfModule.join.ref,
            MarshalledArray.from(this.value.module, this.value.jsModule, [separator]).value.address,
        );
    }

    public concat(...arrays: MarshalledArray<TNative>[]): MarshalledArray<TNative>
    {
        return new MarshalledArray(Marshall.from(this.value,
            this.value.jsModule.callMethod(
                this.value.jsModule.getProperty(this.value.jsModule.heap.get(this.value.module.usize.const(2)),
                    this.selfModule.Array.ref),
                this.selfModule.concat.ref,
                MarshalledArray.from(this.value.module, this.value.jsModule, arrays.map(a => a.address)).value.address,
            )));
    }

    public reverse(): MarshalledArray<TNative>
    {
        return new MarshalledArray(Marshall.from(this.value, this.value.jsModule.callMethod(
            this.value.address,
            this.selfModule.reverse.ref,
            this.value.jsModule.EmptyArray,
        )));
    }
}
