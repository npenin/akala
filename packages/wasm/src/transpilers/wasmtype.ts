
export type u32 = number;
export type u8 = number;

export type wasmtype<T> = { [key in keyof T]: T[key] extends (...args: number[]) => (number | number[])[] ? T[key] : T[key] extends number[] ? T[key] : never }

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
