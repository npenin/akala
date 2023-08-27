import { Cursor } from "@akala/protocol-parser";
import tlsf from "../allocators/tlsf.js";
import evaluate from "../eval/root.js";
import { memory } from "../helpers/memory.js";
import { Module } from "../helpers/module.js";
import { i32 } from "../helpers/types.js";
import assert from 'assert'

const m = new Module();
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

let alloctor = tlsf(m, memory.wasm32, 3, 32);

let stack = []
// evaluate(m, m.call(alloctor.mapping_insert, [i32.const(74)], []), new Cursor(), stack)
// assert.strictEqual(6, stack[0])
// assert.strictEqual(1, stack[1])

// alloctor = tlsf(m, memory.wasm32, 5, 32);
// stack = []
// evaluate(m, m.call(alloctor.mapping_insert, [i32.const(74)], []), new Cursor(), stack)
// assert.strictEqual(6, stack[0])
// assert.strictEqual(5, stack[1])

evaluate(m, alloctor.init, new Cursor(), mem, stack)
