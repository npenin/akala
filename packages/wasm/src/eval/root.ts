import { Cursor, parserWrite, parsers } from "@akala/protocol-parser";
import { Module } from "../helpers/module.js";
import { control as ControlTranspiler, control } from "../transpilers/control.js";
import { i32 } from "../transpilers/i32.js";
import { local } from "../transpilers/local.js";
import { memory } from "../transpilers/memory.js";
import { u32 } from "../transpilers/wasmtype.js";
import { i32 as hi32 } from '../helpers/i32.js'

export default function evaluate<TNative extends number | bigint>(module: Module<TNative>, code: { expr?: Uint8Array, offset?: u32 }, cursor: Cursor, mem: Buffer, stack: (number | bigint)[] = [])
{
    const opCodes = code.expr;
    const buffer = Buffer.from(opCodes);
    let memarg = { align: 0, offset: 0 };
    let op1: number | bigint;
    while (cursor.floorOffset < opCodes.length)
    {
        const opCode = opCodes[cursor.offset];
        cursor.offset++;
        switch (opCode)
        {
            case control.end:
                return cursor.offset;
            case control.block:
            case control.loop:
                break;
            case control.if:
                if (stack.pop())
                {
                    evaluate(module, { expr: opCodes, offset: cursor.offset }, cursor, mem, stack);
                }
                else
                {
                    cursor.offset = opCodes.indexOf(control.end, cursor.offset) + 1;

                }
                break;
            case control.else:
                if (stack.pop())
                {
                    evaluate(module, { expr: opCodes, offset: cursor.offset }, cursor, mem, stack);
                }
                else
                {
                    const offset = opCodes.indexOf(control.end, cursor.offset) + 1;
                    cursor.offset = offset;
                    evaluate(module, { expr: opCodes, offset }, cursor, mem, stack);
                }
                break;
            case control.br:
            case control.br_if:
            case control.br_table:
                return
            case control.call:
                const func = module.getFunc(opCodes[cursor.offset] as number);
                cursor.offset++;
                const params = func.parameters.map(() => stack.pop());
                params.push(...new Array(func.locals.length));
                evaluate(module, func, new Cursor(), mem, params)
                func.results.map(_ => stack.push(params.pop()));
                break;
            case control.call_indirect:

            case control.empty_block:
            case control.unreachable:
            case control.nop:
            case control.end:
            case control.return:

                break;
            case control.drop:
                stack.pop();
            case i32.const:
                stack.push(hi32.parser.read(buffer, cursor));
                break;
            case i32.load:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                stack.push(mem.readUint32LE(Number(stack.pop()) + memarg.offset))
                break;
            case i32.load8_s:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                stack.push(mem.readInt8(Number(stack.pop()) + memarg.offset))
                break;
            case i32.load8_u:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                stack.push(mem.readUint8(Number(stack.pop()) + memarg.offset))
                break;
            case i32.load16_s:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                stack.push(mem.readInt16LE(Number(stack.pop()) + memarg.offset))
                break;
            case i32.load16_u:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                stack.push(mem.readUint16LE(Number(stack.pop()) + memarg.offset))
                break;
            case i32.store:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                memarg.offset += Number(stack.pop())
                mem.writeUint32LE(Number(stack.pop()), memarg.offset)
                break;
            case i32.store8:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                memarg.offset += Number(stack.pop())
                mem.writeUint8(Number(stack.pop()), memarg.offset)
                break;
            case i32.store16:
                memarg.align = opCodes[cursor.offset++];
                memarg.offset = hi32.parser.read(buffer, cursor);
                memarg.offset += Number(stack.pop())
                mem.writeUint16LE(Number(stack.pop()), memarg.offset)
                break;
            case i32.eqz:
                stack.push(stack.pop() === 0 ? 1 : 0)
                break;
            case i32.eq:
                stack.push(stack.pop() === stack.pop() ? 1 : 0)
                break;
            case i32.ne:
                stack.push(stack.pop() !== stack.pop() ? 1 : 0)
                break;
            case i32.lt_s:
            case i32.lt_u:
                op1 = stack.pop();
                stack.push(stack.pop() > op1 ? 1 : 0)
                break;
            case i32.gt_s:
            case i32.gt_u:
                op1 = stack.pop();
                stack.push(stack.pop() < op1 ? 1 : 0)
                break;
            case i32.le_s:
            case i32.le_u:
                op1 = stack.pop();
                stack.push(stack.pop() >= op1 ? 1 : 0)
                break;
            case i32.ge_s:
            case i32.ge_u:
                op1 = stack.pop();
                stack.push(stack.pop() >= op1 ? 1 : 0)
                break;
            case i32.clz:
                const clz = stack.pop().toString(2).padStart(32, '0');
                stack.push(clz.match(/^0+/)[0].length)
                break;
            case i32.ctz:
                const ctz = stack.pop().toString(2);
                stack.push(ctz.match(/0+$/)[0].length)
                break;
            case i32.popcnt:
                const popcnt = stack.pop().toString(2);
                stack.push(popcnt.replace(/0/g, '').length)
                break;
            case i32.add:
                stack.push(stack.pop() as number + (stack.pop() as number))
                break;
            case i32.sub:
                stack.push(-stack.pop() as number + (stack.pop() as number))
                break;
            case i32.mul:
                stack.push(stack.pop() as number * (stack.pop() as number))
                break;
            case i32.div_s:
            case i32.div_u:
                stack.push(1 / (stack.pop() as number) * (stack.pop() as number))
                break;
            case i32.rem_s:
            case i32.rem_u:
                op1 = stack.pop();
                stack.push(stack.pop() as number % (op1 as number))
                break;
            case i32.and:
                stack.push((stack.pop() as number) & (stack.pop() as number))
                break;
            case i32.or:
                stack.push((stack.pop() as number) | (stack.pop() as number))
                break;
            case i32.xor:
                stack.push((stack.pop() as number) ^ (stack.pop() as number))
                break;
            case i32.shl:
                op1 = stack.pop() as number;
                stack.push((stack.pop() as number) << op1)
                break;
            case i32.shr_s:
            case i32.shr_u:
                op1 = stack.pop() as number;
                stack.push((stack.pop() as number) >> op1)
                break;
            case i32.rotl:
            case i32.rotr:
                throw new Error('Not implemented')
            case i32.wrap_i64:
                stack.push(Number(stack.pop() as bigint));
                break;
            case local.get:
                stack.push(stack[opCodes[cursor.offset++] as number])
                break;
            case local.set:
                stack[opCodes[cursor.offset++] as number] = stack.pop()
                break;
            case local.tee:
                stack.push(stack[opCodes[cursor.offset++] as number] = stack.pop())
                break;
            case memory.size[0]:
                cursor.offset++; //ignore memory idx
                stack.push(mem.length / 65536);
                break;
            default:
                throw new Error(`Not implemented: ${opCode.toString(16)}, found at 0x${(cursor.offset - 1 + code.offset).toString(16)}`)
        }
    }
}