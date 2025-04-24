import { global } from "./global.js";
import { memory } from "./memory.js";
import { func, parameters } from "./func.js";
import { table } from "./table.js";
import { getValType, mergeUInt8Arrays } from "./types.js";
import { control } from "./control.js";
import { indexes, wasmtype, wasmtypeInstance } from "./wasmtype.js";
import { local } from "./local.js";
import { u8 } from "../transpilers/wasmtype.js";
import { ImportExportDescription, ModuleSection, ModuleSections } from "../structure.js";
import { IsomorphicBuffer } from "@akala/core";

/**
 * Handler function type for processing WebAssembly function results
 */
type ResultHandler<T> = (result: T) => IsomorphicBuffer;

/**
 * Type helper for mapping WebAssembly function result types to their handlers
 */
export type ResultHandlers<T extends readonly wasmtype<any>[]> = T extends never[] ? never[] :
    T extends [wasmtype<infer T1>] ? [ResultHandler<T1>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>] ? [ResultHandler<T1>, ResultHandler<T2>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>] ? [ResultHandler<T1>, ResultHandler<T2>, ResultHandler<T3>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>] ? [ResultHandler<T1>, ResultHandler<T2>, ResultHandler<T3>, ResultHandler<T4>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>] ? [ResultHandler<T1>, ResultHandler<T2>, ResultHandler<T3>, ResultHandler<T4>, ResultHandler<T5>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>, wasmtype<infer T6>] ? [ResultHandler<T1>, ResultHandler<T2>, ResultHandler<T3>, ResultHandler<T4>, ResultHandler<T5>, ResultHandler<T6>] :
    T extends [wasmtype<infer T1>, wasmtype<infer T2>, wasmtype<infer T3>, wasmtype<infer T4>, wasmtype<infer T5>, wasmtype<infer T6>, wasmtype<infer T7>] ? [ResultHandler<T1>, ResultHandler<T2>, ResultHandler<T3>, ResultHandler<T4>, ResultHandler<T5>, ResultHandler<T6>, ResultHandler<T7>] :
    ResultHandler<any>[]
    ;

/**
 * Represents a WebAssembly module
 * @template TNative - The native numeric type (bigint or number) used for memory addresses
 */
export class Module<TNative extends bigint | number>
{
    /**
     * Gets a function by its export name
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param exportName - Name of the exported function
     * @returns The function matching the export name
     */
    getFuncByExport<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(exportName: string): func<T, U>
    {
        return this.exports.find(e => e.name == exportName).desc as func<T, U>;
    }

    /**
     * Creates a module from WebAssembly sections
     * @template TNative - Native numeric type
     * @param sections - Array of module sections
     * @returns A new Module instance
     */
    static fromSections<TNative extends bigint | number>(sections: ModuleSections[]): Module<TNative>
    {
        const module = new Module<TNative>();

        sections.forEach(s =>
        {
            switch (s.id)
            {
                case 1:
                    module.types.push(...s.section);
                    break;
                case 2:
                    s.section.forEach(i => module.importFunc(i.module, i.entity, module.types[i.index].parameters.map(p => getValType(p)), module.types[i.index].results.map(r => getValType(r))));
                    break;
                case 3:
                    module.funcs.push(...s.section.map(f => ({ type: f.type, func: func.new(module.types[f.type].parameters.map((p, i) => new local(i, getValType(p) as unknown as wasmtype<wasmtypeInstance<any>>)), module.types[f.type].results.map(r => getValType(r)), null, null) })))
                    break;
                case 7:
                    module.exports.push(...s.section.map(xp => ({ name: xp.name, desc: module.funcs[xp.index].func })))
                    break;
                case 10:
                    s.section.map((c, i) =>
                    {
                        module.funcs[i].func.expr = c.expr;
                        module.funcs[i].func.offset = c.offset;

                        const locals = [];
                        for (let l of c.locals)
                        {
                            for (let i = 0; i < l[0]; i++)
                            {
                                locals.push(new local((module.funcs[i].func.parameters?.length || 0) + locals.length, getValType(l[1]) as unknown as wasmtype<wasmtypeInstance<any>>))
                            }
                        }
                        module.funcs[i].func.locals = locals;
                    })
            }
        })
        return module;
    }

    /**
     * Gets the index of a function in the module
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param func - Function to find
     * @returns Index of the function
     */
    indexOfFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(func: func<T, U>): number
    {
        return this.funcs.findIndex(f => f.func === func);
    }

    /** Array of function type definitions */
    private readonly types: { parameters: wasmtype<any>['type'][], results: wasmtype<any>['type'][] }[] = [];
    /** Array of functions in the module */
    private readonly funcs: { func: func<readonly wasmtype<any>[], readonly wasmtype<any>[]>, type: number }[] = [];
    /** Array of tables in the module */
    private readonly tables: table<wasmtype<any>, TNative>[] = [];
    /** Array of memory definitions */
    private readonly mems: { max: u8, initial: u8, flags: boolean }[] = [];
    /** Array of global variables */
    private readonly globals: global[] = [];
    /** Imported functions */
    private readonly imports: { func: { moduleName: string, funcName: string, func: { func: func<readonly wasmtype<any>[], readonly wasmtype<any>[]>, type: number } }[] } = { func: [] };
    /** Exported entities */
    private readonly exports: { name: string, desc: (table<wasmtype<any>, TNative> | memory<TNative> | global | func<wasmtype<any>[], wasmtype<any>[]>) }[] = [];

    /**
     * Declares memory requirements for the module
     * @param pageSize - Initial memory size in pages
     * @param maxPageSize - Maximum memory size in pages
     */
    public needMemory(pageSize: number, maxPageSize?: number)
    {
        this.mems.push({ max: maxPageSize, initial: pageSize, flags: typeof (maxPageSize) !== 'undefined' });
    }

    /**
     * Imports a function from another module
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param moduleName - Name of the module to import from
     * @param funcName - Name of the function to import
     * @param args - Array of parameter types
     * @param results - Array of result types
     * @returns Object containing the imported function and its index
     */
    public importFunc<const T extends wasmtype<any>[], const U extends wasmtype<any>[]>(moduleName: string, funcName: string, args: T, results: U)
    {
        const f = func.ref(args, results);
        const type = this.addType({ parameters: args.map(p => p.type), results: results.map(p => p.type) });
        const result = { func: f, index: this.imports.func.push({ moduleName, funcName, func: { func: f, type: type } }) }
        return result;
    }

    /**
     * Adds a type definition to the module
     * @param type - Type definition with parameters and results
     * @returns Index of the type in the module
     */
    private addType(type: { parameters: wasmtype<any>['type'][], results: wasmtype<any>['type'][] })
    {
        const index = this.types.findIndex(t => t.parameters.length == type.parameters.length &&
            t.results.length == type.results.length &&
            t.parameters.reduce((previous, current, i) => previous && current === type.parameters[i], true) &&
            t.results.reduce((previous, current, i) => previous && current === type.results[i], true))
        if (index > -1)
            return index;
        return this.types.push(type) - 1;
    }

    /**
     * Adds a function to the module
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param f - Function to add
     * @returns Object containing the function and its index
     */
    public addFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(f: func<T, U>): { func: func<T, U>, index: indexes.func }
    {
        return { func: f, index: this.imports.func.length + this.funcs.push({ func: f, type: this.addType({ parameters: f.parameters.map(p => p.type), results: f.results.map(p => p.type) }) }) - 1 };
    }

    /**
     * Gets a function by its index
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param f - Function index
     * @returns The function at the specified index
     */
    public getFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(f: indexes.func): func<T, U>
    {
        return this.funcs[f].func as func<T, U>;
    }

    /**
     * Adds a table to the module
     * @param t - Table to add
     * @returns Index of the added table
     */
    public addTable(t: table<wasmtype<any>, TNative>)
    {
        return this.tables.push(t) - 1;
    }

    /**
     * Exports an entity from the module
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param name - Export name
     * @param desc - Entity to export (table, memory, global, or function)
     */
    public export<T extends wasmtype<any>[], U extends wasmtype<any>[]>(name: string, desc: table<wasmtype<any>, TNative> | memory<TNative> | global | func<T, U>)
    {
        this.exports.push({ name, desc });
    }

    /**
     * Calls a function in the module
     * @template T - Array of parameter types
     * @template U - Array of result types
     * @param f - Function to call
     * @param args - Arguments to pass to the function
     * @param results - Handlers for processing the function results
     * @returns Buffer containing the call instruction and processed results
     */
    public call<T extends readonly wasmtype<any>[], U extends readonly wasmtype<any>[]>(f: func<T, U>, args: parameters<T>, results: ResultHandlers<U>): IsomorphicBuffer
    {
        let fIndex = this.imports.func.length + this.funcs.findIndex(f2 => f2.func == f);
        if (fIndex == -1)
            fIndex = this.addFunc(f).index
        // throw new Error('the function is not registered');
        return mergeUInt8Arrays(...args.flatMap(a => a.toOpCodes()), [control.transpiler.call, fIndex], ...results.flatMap((r, i) => r(f.results[i].pop())));
    }

    /**
     * Gets all sections of the module
     * @returns Array of module sections
     */
    public sections()
    {
        return ([
            // null,//custom
            this.types.length ? { id: 1, section: this.types.map(t => ({ ...t, start: func.transpiler.start })) } as ModuleSection<1> : null,//type
            this.imports.func.length ? { id: 2, section: this.imports.func.map(f => ({ module: f.moduleName, entity: f.funcName, type: ImportExportDescription.Func, index: f.func.type })) } as ModuleSection<2> : null,//import
            this.funcs.length ? { id: 3, section: this.funcs } as ModuleSection<3> : null,//function
            // null,//table
            { id: 5, section: this.mems } as ModuleSection<5>,//memory
            // null,//global
            this.exports.length ? {
                id: 7, section: this.exports.map(e =>
                {
                    if (e.desc instanceof table)
                        return { name: e.name, index: this.tables.findIndex(f => f == e.desc), type: 0x03 }
                    else if (e.desc instanceof memory)
                        return { name: e.name, index: this.mems.findIndex(f => f == e.desc), type: 0x02 }
                    else if (e.desc instanceof global)
                        return { name: e.name, index: this.globals.findIndex(f => f == e.desc), type: 0x01 }
                    else if (e.desc instanceof func)
                        return { name: e.name, index: this.funcs.findIndex(f => f.func == e.desc), type: 0x00 }
                    else
                        throw new Error('not supported')
                })
            } as ModuleSection<7> : null,//export
            // null,//start
            // null,//element
            this.funcs.length ? { id: 10, section: this.funcs.map(f => ({ locals: compress(f.func.locals.map(l => l.type.type)), expr: f.func.expr })) } as ModuleSection<10> : null,//code 
            // null,//data
            // null,//data count
        ]).filter(x => x);
    }
}

/**
 * Compresses repeated values in an array
 * @param v - Array of numbers to compress
 * @returns Array of tuples containing count and value
 */
function compress(v: number[]): [number, number][]
{
    const result = [];
    for (let i = 0; i < v.length; i++)
    {
        if (result.length == 0)
            result.push([1, v[i]]);
        else if (result[result.length - 1][1] == v[i])
            result[result.length - 1][0]++;
        else
            result.push([1, v[i]]);
    }

    return result;
}
