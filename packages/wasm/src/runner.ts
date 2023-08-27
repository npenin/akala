import fs from 'fs/promises'
import * as wasm from './index.js'
import { Cursor } from '@akala/protocol-parser'
import evaluate from './eval/root.js';
import { Module } from './helpers/module.js';

const file = await fs.readFile(process.argv[2])
const m = wasm.module.read(file, new Cursor(), {});
const module = Module.fromSections(m.sections);
const mem = Buffer.alloc(65536);
(['writeUint32LE', 'readUint32LE', 'writeInt32LE', 'readInt32LE', 'readUint8', 'writeUint8', 'writeUint16LE', 'readUint16LE', 'readInt16LE', 'readInt16LE']).forEach(k =>
{
    const f = mem[k];
    if (k.startsWith('write'))
        mem[k] = function (value, offset)
        {
            console.log(`${k} ${value} at ${offset}`);
            return f.call(this, value, offset);
        }
    else
        mem[k] = function (offset)
        {
            const value = f.call(this, offset);
            console.log(`${k} ${value} at ${offset}`);
            return value;
        }
})
evaluate(module, module.getFuncByExport('_start'), new Cursor(), mem);