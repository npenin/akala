import { Allocator } from "../allocators/contract.js";
import { memory, usize, usizeType } from "../helpers/memory.js";
import { Module } from "../helpers/module.js";
import tlsf, { Tlsf } from "../allocators/tlsf.js";
import { func } from "../helpers/func.js";
import { wasmtype } from "../helpers/wasmtype.js";
import { control } from "../transpilers/control.js";
import { mergeUInt8Arrays } from "../helpers/types.js";
import { u32 } from "../transpilers/wasmtype.js";

export class Runtime<TNative extends bigint | number = bigint | number> extends Module<TNative>
{
    public readonly allocator: Allocator<TNative>;
    private _start = new Uint8Array();

    constructor(public readonly arch: memory<TNative>)
    {
        super();
        this.allocator = new Tlsf(this, arch, 3);
    }

    public override sections()
    {
        this.export('_start', this.addFunc(func.new([], [], [], this._start)).func)
        return super.sections()
    }

    onStart(arg0: Uint8Array | ArrayLike<u32>)
    {
        this._start = mergeUInt8Arrays(this._start, arg0);
    }

    defineOwnedClass<T extends Record<string | number | symbol, (runtime: Runtime<TNative>) => func<[usizeType<TNative>, ...wasmtype<unknown>[]], wasmtype<unknown>[]>>>(def: T)
    {
        Object.entries(def).map(e =>
        {
            this.addFunc(e[1](this));
        })

        const allocator = this.allocator;

        const metaClass = {
            create()
            {
                return allocator.malloc(metaClass.size)
            },
            destroy: (address: usize<TNative>) =>
            {
                return allocator.free(address)
            }
        };
        return metaClass;
    }

    defineStatelessClass<T extends Record<string | number | symbol, (runtime: Runtime<TNative>) => func<[usizeType<TNative>, ...wasmtype<unknown>[]], wasmtype<unknown>[]>>>(def: T)
    {
        const allocator = this.allocator;

        const metaClass = {
            create()
            {
                return allocator.malloc(metaClass.size)
            },
            destroy: (address: usize<TNative>) =>
            {
                return allocator.free(address)
            },
            size: this.arch.address.const(0),
        };
        return metaClass;
    }
}