import { Cursor } from "@akala/protocol-parser";
import evaluate from "../eval/root.js";
import { Module } from "../helpers/module.js";
import { i32 } from "../helpers/i32.js";
import { JsModule } from "../runtime/js_sys.module.js";
import { MarshalledArray } from "../runtime/js_sys.Array.js";

const m = new Module(i32);

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

const jsModule = JsModule(m, 'js-sys');

const arrayModule = MarshalledArray.register(m, jsModule);

evaluate(m, {
    expr: jsModule.getPropertyi32(jsModule.EmptyArray, arrayModule.length.ref).eqz().toOpCodes()
}, new Cursor(), mem, []);
