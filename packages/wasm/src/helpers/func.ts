import { local } from './local.js';
import { mergeUInt8Arrays } from './types.js';
import { type wasmtype, type wasmtypeInstance, type wasmtypewasmInstance } from './wasmtype.js'
import { func as transpiler } from '../transpilers/func.js'
import { control } from '../transpilers/control.js';
import { type u32 } from '../transpilers/wasmtype.js';
import { IsomorphicBuffer } from '@akala/core';

/**
 * Type helper for extracting parameter types from WebAssembly function signatures
 */
export type parameters<T extends readonly wasmtype<any>[]> = T extends never[] ? never[] :
    T extends [wasmtype<infer T1>] ? [T1] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>] ? [T1, T2] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>] ? [T1, T2, T3] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>] ? [T1, T2, T3, T4] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>] ? [T1, T2, T3, T4, T5] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>, wasmtype<infer T6>] ? [T1, T2, T3, T4, T5, T6] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>, wasmtype<infer T6>, wasmtype<infer T7>] ? [T1, T2, T3, T4, T5, T6, T7] :
    readonly wasmtypeInstance<any>[]
    ;

/**
 * Represents a WebAssembly function
 * @template T - Array of parameter types
 * @template U - Array of result types
 */
export class func<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]> implements wasmtypeInstance<func<T, U>>
{
    /** Array of parameter types */
    public parameters: T;
    /** Array of result types */
    public results: U;
    /** Array of local variables */
    public locals: local<wasmtypeInstance<any>>[] = [];
    /** Optional function offset */
    public offset?: u32;

    /**
     * Creates a new function instance
     * @param expr - Optional buffer containing function expression
     */
    public constructor(public expr?: IsomorphicBuffer)
    {
    }

    /**
     * Converts the function to WebAssembly opcodes
     * @returns The operation buffer as opcodes
     */
    public toOpCodes(): IsomorphicBuffer
    {
        return this.expr;
    }

    public readonly type = func;

    /**
     * Creates an empty function instance
     * @returns A new function with no operations
     */
    public static pop<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>()
    {
        return new func<T, U>(null);
    }

    /**
     * Creates a new function with parameters, results, and locals
     * @param parameters - Array of parameter declarations
     * @param results - Array of result types
     * @param locals - Array of local variable declarations
     * @param expr - Function body expressions
     * @returns A new function instance
     */
    public static new<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(parameters: { [key in keyof T]: local<wasmtypewasmInstance<T[key]>> }, results: U, locals: local<wasmtypeInstance<any>>[], expr: IsomorphicBuffer)
    {
        if (expr && expr[expr.length - 1] !== control.end)
            expr = mergeUInt8Arrays(expr, [control.end]);
        const f = new func<T, U>(expr || undefined);
        f.parameters = parameters.map(p => p.type) as any;
        f.results = results;
        f.locals = locals;
        return f;
    }

    public static readonly transpiler = transpiler;

    public static readonly type = transpiler.type;

    /**
     * Creates a reference to a function type
     * @param params - Array of parameter types
     * @param results - Array of result types
     * @returns A new function type reference
     */
    public static ref<const T extends readonly wasmtype<any>[], const  U extends readonly wasmtype<any>[]>(params: T, results: U)
    {
        const f = new func<T, U>(null);
        f.parameters = params;
        f.results = results;

        return f;
    }

    /**
     * Converts the function to its WebAssembly type representation
     * @returns Array containing the function type encoding
     */
    public toWasmType()
    {
        return [0x60, this.parameters, this.results]
    }
}

// type ArrayItemType<T> = T extends Array<infer X> ? X : never;


export const type = func.type

// export class namedFunc<T extends { name: string, type: local<wasmtypeInstance<any>> }[], U extends { name: string, type: local<wasmtypeInstance<any>> }[], V extends { name: string, type: local<wasmtypeInstance<any>> }[]> extends func<T, U, V>
// {
//     public readonly namedParams: Record<string, ArrayItemType<T> & { index: number }>;
//     public readonly namedResults: Record<string, ArrayItemType<U> & { index: number }>;

//     public constructor(params: T, results: U, locals: V = [] as V, instructions: IsomorphicBuffer = [])
//     {
//         super(params.map(p => p.type) as any, results.map(p => p.type) as any, locals, instructions);
//         this.namedParams = Object.fromEntries(params.map((x, i) => [x.name, { ...x, index: i }])) as any;
//         this.namedResults = Object.fromEntries(results.map((x, i) => [x.name, { ...x, index: i }])) as any;
//     }

//     public static namedRef<T extends { name: string, type: local<wasmtypeInstance<any>> }[], U extends { name: string, type: local<wasmtypeInstance<any>> }[]>(params: T, results: U)
//     {
//         return new namedFunc(params, results, null, null);
//     }
// }
