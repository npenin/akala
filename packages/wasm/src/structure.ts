import { valtype } from "./helpers/types.js";
import { u32, u8 } from "./transpilers/wasmtype.js";

export interface Module
{
    magic: '\0asm';
    version: number;
    sections: ModuleSections[];
}

export type ModuleSectionMap = {
    0: CustomSection,
    1: TypeSection[],
    2: ImportSection[],
    3: FuncSection[],
    5: MemorySection[],
    7: ExportSection[],
    10: CodeSection[]
}

export type ModuleSection<T extends keyof ModuleSectionMap> = { id: T, section: ModuleSectionMap[T] }
export type ModuleSections = ModuleSection<0>
    | ModuleSection<1>
    | ModuleSection<2>
    | ModuleSection<3>
    | ModuleSection<5>
    | ModuleSection<7>
    | ModuleSection<10>
    ;

type CustomSection = Buffer;


export const types = { ...valtype }
export type types = valtype;

export interface TypeSection
{
    start: u8,
    parameters: types[];
    results: types[];
}

export interface FuncSection
{
    type: u32;
}

export interface MemorySection
{
    flags: boolean;
    initial: u8;
    max: u8;
}

export interface ExportSection
{
    name: string;
    type: ImportExportDescription;
    index: u32;
}

export interface ImportSection
{
    module: string;
    entity: string;
    type: ImportExportDescription;
    index: u32;
}

export enum ImportExportDescription
{
    Func = 0x00,
    Table = 0x01,
    Memory = 0x02,
    Global = 0x03,
}

export interface CodeSection
{
    locals: [u8, valtype][];
    expr: Uint8Array;
    offset: u32;
}
