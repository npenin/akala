import { IsomorphicBuffer } from "@akala/core";
import { u32 } from "../transpilers/wasmtype.js";

export interface wasmtypeInstance<T = unknown>
{
    toOpCodes(): IsomorphicBuffer;
    type: wasmtype<T>
}

export interface wasmtype<T>
{
    new(initialOp: IsomorphicBuffer): T;
    pop(): T;
    type: number;
}

export namespace indexes
{
    export type type = u32
    export type func = u32
    export type table = u32
    export type memory = u32
    export type global = u32
    export type elem = u32
    export type data = u32
    export type local = u32
    export type label = u32
    export type lane = u32
}
