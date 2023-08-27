import { parsers, uint32 } from "@akala/protocol-parser";
import { Module } from "../helpers/module.js";
import { func, v128, i32, i64, blocktype, mergeUInt8Arrays } from "../helpers/types.js";
import { local } from "../helpers/local.js";
import { control } from "../helpers/control.js";
import { memory } from "../helpers/memory.js";
import { u32 } from "../transpilers/wasmtype.js";

export class bit extends parsers.Bit
{
    register<TNative extends bigint | u32>(module: Module<TNative>, memory: memory<TNative>)
    {
        const cursor = new local(0, v128.i64);
        const buffer = new local(1, i32);
        const currentValue = new local(2, i32);
        const value = new local(3, i32);


        return {
            read: module.addFunc(func.new([cursor, buffer] as const, [i32] as const, [currentValue, value],
                mergeUInt8Arrays([
                    ...currentValue.set(i32.load8_u(memory.memarg(0, 0), cursor.get().extract_lane(0).wrap())),
                    ...control.ifelse(undefined, cursor.get().extract_lane(1).eqz(),
                        mergeUInt8Arrays(
                            currentValue.get().and(i32.const(0b00000001)).toOpCodes(),
                            [control.transpiler.br, 1]
                        ),
                        mergeUInt8Arrays(
                            currentValue.get().and(i32.const(0b1).shl(cursor.get().extract_lane(1).wrap())).shr_u(cursor.get().extract_lane(1).wrap()).toOpCodes(),
                            [control.transpiler.br, 1]
                        )).toOpCodes(),
                    ...cursor.get().replace_lane(0, cursor.get().extract_lane(0).add(i64.const(BigInt(1)))).toOpCodes(),
                    ...currentValue.get().toOpCodes(),
                ])
            )
            )
        }
    }
}