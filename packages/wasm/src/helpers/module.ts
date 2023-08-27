import { global } from "./global.js";
import { memory } from "./memory.js";
import { func as func, parameters } from "./func.js";
import { table } from "./table.js";
import { getValType, mergeUInt8Arrays, valtype } from "./types.js";
import { control } from "./control.js";
import { indexes, wasmtype, wasmtypeInstance } from "./wasmtype.js";
import { local } from "./local.js";
import { u32, u8 } from "../transpilers/wasmtype.js";
import { ImportExportDescription, ModuleSection, ModuleSections, TypeSection } from "../structure.js";

type ResultHandler<T> = (result: T) => Uint8Array;

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

export class Module<TNative extends bigint | number>
{
    getFuncByExport<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(exportName: string): func<T, U>
    {
        return this.exports.find(e => e.name == exportName).desc as func<T, U>;
    }
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
    indexOfFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(func: func<T, U>): number
    {
        return this.funcs.findIndex(f => f.func === func);
    }
    private readonly types: { parameters: wasmtype<any>['type'][], results: wasmtype<any>['type'][] }[] = [];
    private readonly funcs: { func: func<readonly wasmtype<any>[], readonly wasmtype<any>[]>, type: number }[] = [];
    private readonly tables: table<wasmtype<any>, TNative>[] = [];
    private readonly mems: { max: u8, initial: u8, flags: boolean }[] = [];
    private readonly globals: global[] = [];
    private readonly elems = [];
    private readonly datas = [];
    private readonly start = [];
    private readonly imports: { func: { moduleName: string, funcName: string, func: { func: func<readonly wasmtype<any>[], readonly wasmtype<any>[]>, type: number } }[] } = { func: [] };
    private readonly exports: { name: string, desc: (table<wasmtype<any>, TNative> | memory<TNative> | global | func<wasmtype<any>[], wasmtype<any>[]>) }[] = [];

    public needMemory(pageSize: number, maxPageSize?: number)
    {
        this.mems.push({ max: maxPageSize, initial: pageSize, flags: typeof (maxPageSize) !== 'undefined' });
    }

    public importFunc<const T extends wasmtype<any>[], const U extends wasmtype<any>[]>(moduleName: string, funcName: string, args: T, results: U)
    {
        const f = func.ref(args, results);
        const type = this.addType({ parameters: args.map(p => p.type), results: results.map(p => p.type) });
        const result = { func: f, index: this.imports.func.push({ moduleName, funcName, func: { func: f, type: type } }) }
        return result;
    }

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

    public addFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(f: func<T, U>): { func: func<T, U>, index: indexes.func }
    {
        return { func: f, index: this.imports.func.length + this.funcs.push({ func: f, type: this.addType({ parameters: f.parameters.map(p => p.type), results: f.results.map(p => p.type) }) }) - 1 };
    }

    public getFunc<const T extends readonly wasmtype<any>[], const U extends readonly wasmtype<any>[]>(f: indexes.func): func<T, U>
    {
        return this.funcs[f].func as func<T, U>;
    }

    public addTable(t: table<wasmtype<any>, TNative>)
    {
        return this.tables.push(t) - 1;
    }

    public export<T extends wasmtype<any>[], U extends wasmtype<any>[]>(name: string, desc: table<wasmtype<any>, TNative> | memory<TNative> | global | func<T, U>)
    {
        this.exports.push({ name, desc });
    }

    public call<T extends readonly wasmtype<any>[], U extends readonly wasmtype<any>[]>(f: func<T, U>, args: parameters<T>, results: ResultHandlers<U>): Uint8Array
    {
        let fIndex = this.imports.func.length + this.funcs.findIndex(f2 => f2.func == f);
        if (fIndex == -1)
            fIndex = this.addFunc(f).index
        // throw new Error('the function is not registered');
        return mergeUInt8Arrays(...args.flatMap(a => a.toOpCodes()), [control.transpiler.call, fIndex], ...results.flatMap((r, i) => r(f.results[i].pop())));
    }

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