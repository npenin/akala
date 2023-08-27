import { valtype } from './types.js';
import { wasmtype } from './wasmtype.js'


export class func
{
    public constructor(public readonly parameters: valtype[], public readonly results: valtype[], public readonly locals: valtype[] = [], public readonly expr: number[][] = []) { }

    public static readonly type = 0x70

    public static readonly start = 0x60

    public static ref(params: valtype[], results: valtype[])
    {
        return new func(params, results, null, null);
    }

    public toWasmType()
    {
        return [0x60, this.parameters, this.results]
    }

    public addInstruction(instr: number[])
    {
        this.expr.push(instr);
    }
}

export const type = func.type

export class namedFunc extends func
{
    public readonly namedParams: Record<string, { name: string, type: valtype, index: number }>;
    public readonly namedResults: Record<string, { name: string, type: valtype, index: number }>;

    public constructor(params: { name: string, type: valtype }[], results: { name: string, type: valtype }[], locals: valtype[] = [], instructions: number[][] = [])
    {
        super(params.map(p => p.type), results.map(p => p.type), locals, instructions);
        this.namedParams = Object.fromEntries(params.map((x, i) => [x.name, { ...x, index: i }]));
        this.namedResults = Object.fromEntries(results.map((x, i) => [x.name, { ...x, index: i }]));
    }

    public static namedRef(params: { name: string, type: valtype }[], results: { name: string, type: valtype }[])
    {
        return new namedFunc(params, results, null, null);
    }
}