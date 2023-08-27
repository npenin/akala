import { Cursor, parserWrite, parsers, uint32, uint8 } from '@akala/protocol-parser'
import './allocators/tlsf.js'
import { memory } from './helpers/memory.js';
import { Runtime } from './runtime/runtime.js';
import { func } from './helpers/func.js';
import util from 'util';
import fs from 'fs/promises'
import { local } from './helpers/local.js';
import { i32 } from './helpers/i32.js';
import { i64 } from './helpers/i64.js';
import { f32 } from './helpers/f32.js';
import { f64 } from './helpers/f64.js';
import { Module as ModuleInstance } from './helpers/module.js';
import { u32, u8 } from './transpilers/wasmtype.js';
import { Tlsf } from './allocators/tlsf.js';
import { CodeSection, ExportSection, FuncSection, ImportSection, MemorySection, Module, ModuleSectionMap, ModuleSections, TypeSection } from './structure.js';
import { mergeUInt8Arrays, valtype } from './helpers/types.js';
import { control } from './transpilers/control.js';

const type = parsers.object<TypeSection>(
    parsers.property('start', parsers.uint8), //0x60
    parsers.property('parameters', parsers.array(parsers.uint8, parsers.uint8)), //params
    parsers.property('results', parsers.array(parsers.uint8, parsers.uint8)), //results
);

// const unaryop: (number)[] = [local.get, local.set, local.tee, i32.clz, i32.const, i32.ctz, i32.eqz, i32.extend16_s, i32.extend8_s, i32.popcnt];
// const binaryop: (number)[] = [i32.add, i32.sub, i32.mul, i32.div_s, i32.div_u, i32.rem_u, i32.rem_s,
// i32.and, i32.or, i32.xor, i32.shl, i32.shr_u, i32.shr_s, i32.rotl, i32.rotr,
// i32.eq, i32.ne, i32.lt_s, i32.lt_u, i32.gt_s, i32.gt_u, i32.le_s, i32.le_u, i32.ge_s, i32.ge_u,

// i64.add, i64.sub, i64.mul, i64.div_s, i64.div_u, i64.rem_u, i64.rem_s,
// i64.and, i64.or, i64.xor, i64.shl, i64.shr_u, i64.shr_s, i64.rotl, i64.rotr,
// i64.eq, i64.ne, i64.lt_s, i64.lt_u, i64.gt_s, i64.gt_u, i64.le_s, i64.le_u, i64.ge_s, i64.ge_u,

// f32.add, f32.sub, f32.mul, f32.div, f32.min, f32.max, f32.copysign,
// f32.abs, f32.neg, f32.sqrt, f32.ceil, f32.floor, f32.trunc, f32.nearest,

// f64.add, f64.sub, f64.mul, f64.div, f64.min, f64.max, f64.copysign,
// f64.abs, f64.neg, f64.sqrt, f64.ceil, f64.floor, f64.trunc, f64.nearest,

// ];

// const operandsCount = Object.fromEntries(unaryop.map(e => [e, 1]).concat(binaryop.map(e => [e, 2])))

class ExprParser extends parsers.FixedBuffer implements parsers.ParserWithMessage<Uint8Array, CodeSection>
{
    constructor()
    {
        super(-1)
    }

    read(buffer: Buffer, cursor: Cursor, message?: CodeSection): Buffer
    {
        if (message)
            message.offset = cursor.offset;
        return super.read(buffer, cursor);
    }

}

const vuint = parsers.signedLEB128;

const x = parsers.array(-1,
    parsers.object<ModuleSections>(
        parsers.property('id', vuint as unknown as parsers.Parser<keyof ModuleSectionMap>),
        parsers.property('section', parsers.sub<ModuleSections['section'], ModuleSections>(vuint,
            parsers.choose<ModuleSections, 'id', ModuleSections['section']>('id', {
                0: parsers.buffer(-1),
                1: parsers.emancipate(parsers.array(vuint, type)),
                2: parsers.emancipate(parsers.array(vuint, parsers.object<ImportSection>(
                    parsers.property('module', parsers.string(vuint)),
                    parsers.property('entity', parsers.string(vuint)),
                    parsers.property('type', vuint),
                    parsers.property('index', vuint),
                ))),
                3: parsers.emancipate(parsers.array(vuint, parsers.object<FuncSection>(
                    parsers.property('type', vuint)
                ))),
                5: parsers.emancipate(parsers.array(vuint, parsers.object<MemorySection>(
                    parsers.property('flags', parsers.boolean(parsers.uint8)),
                    parsers.property('initial', vuint),
                    parsers.chooseProperty<MemorySection, 'flags', 'max'>('flags', 'max', {
                        false: parsers.noop,
                        true: vuint,
                    })
                ))),
                7: parsers.emancipate(parsers.array(vuint, parsers.object<ExportSection>(
                    parsers.property('name', parsers.string(vuint)),
                    parsers.property('type', vuint),
                    parsers.property('index', vuint)
                ))),
                10: parsers.emancipate(parsers.array(vuint, parsers.sub(vuint, parsers.object<CodeSection>(
                    parsers.property('locals', parsers.array(vuint, parsers.array(2, parsers.uint8) as parsers.Parser<[u8, valtype]>)),
                    parsers.property('expr', new ExprParser()
                    )))))
            }))
        )
    )
);

type SimpleModule = Omit<Module, 'magic' | 'version'> & Partial<Pick<Module, 'magic' | 'version'>>;

export const module = parsers.prepare((m) => { m.magic = m.magic || '\0asm', m.version = m.version || 0x1000000 }, parsers.object<SimpleModule>(
    parsers.property('magic', parsers.string<Module['magic']>(4)),
    parsers.property('version', parsers.uint32),
    parsers.property('sections', parsers.emancipate(x))
));

const rt = new Runtime(memory.wasm32);
// const print = rt.importFunc('env', '_debug', [i32, i32], [i32])
rt.allocator.init();
rt.onStart(rt.allocator.start());
rt.onStart(rt.call((rt.allocator as Tlsf<number>).tlsf.mapping_insert, [i32.const(74)], [r => new Uint8Array([control.drop]), r => new Uint8Array([control.drop])]))
// rt.addFunc(func.new([], []))

// const a = new local(0, i32);
// const b = new local(1, i32);
// const f = func.new([a, b], [i32], [],
//     a.get().add(b.get()).toOpCodes()
// );
// const m = new ModuleInstance();
// m.addFunc(f);
// m.export('addTwo', f)


// console.log(JSON.stringify(m.sections(), null, 2));

// console.log(parserWrite(module, sample, sample))

const sections = { sections: rt.sections() } as SimpleModule;
// console.log(JSON.stringify(sections, null, 4));
// console.log(util.inspect(sections, true, 4));
const buffer = Buffer.concat(parserWrite(module, sections));
fs.writeFile('tmp.wasm', buffer)

// fs.readFile('test.wasm').then(buffer =>
// {
//     console.log(buffer);
//     console.log(module.read(buffer, new Cursor(), {}).sections[2])
// });