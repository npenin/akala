import { indexes, wasmtype, wasmtypeInstance } from './wasmtype.js'
import { local as transpiler } from '../transpilers/local.js'
import { mergeUInt8Arrays } from './types.js';

// export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

export class local<T extends wasmtypeInstance<T>>
{
    public constructor(public readonly index: indexes.local, public readonly type: wasmtype<T>) { }

    public get(): T { return new this.type(new Uint8Array([transpiler.get, this.index])); }
    public set(value: T) { return mergeUInt8Arrays(value.toOpCodes(), [transpiler.set, this.index]) }
    public tee(value: T): T { return new this.type(mergeUInt8Arrays(value.toOpCodes(), [transpiler.tee, this.index])) }
}