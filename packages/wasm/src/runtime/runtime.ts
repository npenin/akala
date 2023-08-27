import { Allocator } from "../allocators/contract.js";
import { memory } from "../helpers/memory.js";
import { Module } from "../helpers/module.js";
import tlsf, { Tlsf } from "../allocators/tlsf.js";
import { func } from "../helpers/func.js";
import { wasmtype } from "../helpers/wasmtype.js";
import { control } from "../transpilers/control.js";
import { mergeUInt8Arrays } from "../helpers/types.js";
import { u32 } from "../transpilers/wasmtype.js";

export class Runtime<TNative extends bigint | number> extends Module<TNative>
{
    public readonly allocator: Allocator<TNative>;
    private _start = new Uint8Array();

    constructor(arch: memory<TNative>)
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
}