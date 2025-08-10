import { parsers } from "@akala/protocol-parser";
import { Module } from "../helpers/module.js";
import { func, v128, i32, i64, mergeUInt8Arrays } from "../helpers/types.js";
import { local } from "../helpers/local.js";
import { control } from "../helpers/control.js";
import { memory } from "../helpers/memory.js";
import { type u32 } from "../transpilers/wasmtype.js";

export class uint2 extends parsers.Uint2
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
                            currentValue.get().and(i32.const(0b11)).toOpCodes(),
                            [control.transpiler.br, 1]
                        ),
                        control.ifelse(undefined, cursor.get().extract_lane(1).lt_u(i64.const(7)),
                            mergeUInt8Arrays(
                                currentValue.get().and(i32.const(0b11).shl(cursor.get().extract_lane(1).wrap())).shr_u(cursor.get().extract_lane(1).wrap()).toOpCodes(),
                                [control.transpiler.br, 1]
                            ),
                            mergeUInt8Arrays(
                                currentValue.get().and(i32.const(0b1).shl(cursor.get().extract_lane(1).wrap())).shr_u(cursor.get().extract_lane(1).wrap()).toOpCodes(),
                                currentValue.set(i32.load8_u(memory.memarg(0, 0), cursor.get().extract_lane(0).add(i64.const(BigInt(1))).wrap())),
                                currentValue.get().or(currentValue.get().and(i32.const(0b1)).shl(i32.const(7).shr_u(i32.const(7)))).toOpCodes(),
                                [control.transpiler.br, 1]
                            )).toOpCodes(),
                    ).toOpCodes(),
                    ...cursor.get().replace_lane(0, cursor.get().extract_lane(0).add(i64.const(BigInt(1)))).toOpCodes(),
                    ...currentValue.get().toOpCodes(),
                ])
            )),
            write: module.addFunc(func.new([cursor, buffer, value] as const, [] as const, [currentValue],
                mergeUInt8Arrays([
                    ...currentValue.set(i32.load8_u(memory.memarg(0, 0), memory.address.convert_u(cursor.get().extract_lane(0)))),
                    ...control.ifelse(undefined, cursor.get().extract_lane(1).eqz(),
                        mergeUInt8Arrays(
                            currentValue.get().or(value.get().and(i32.const(0b11))).toOpCodes(),
                            [control.transpiler.br, 1]
                        ),
                        control.ifelse(undefined, cursor.get().extract_lane(1).lt_u(i64.const(7)),
                            mergeUInt8Arrays(
                                currentValue.get().or(value.get().and(i32.const(0b11)).shl(cursor.get().extract_lane(1).wrap())).toOpCodes(),
                                [control.transpiler.br, 1]
                            ),
                            mergeUInt8Arrays(
                                currentValue.get().or(value.get().and(i32.const(0b1)).shl(cursor.get().extract_lane(1).wrap())).store8(memory.memarg(0, 0), memory.address.convert_u(cursor.get().extract_lane(0))),
                                currentValue.set(i32.load8_u(memory.memarg(0, 0), memory.address.convert_u(cursor.get().extract_lane(0).add(i64.const(BigInt(1)))))),
                                currentValue.get().or(value.get().and(i32.const(0b1)).shl(i32.const(7))).toOpCodes(),
                                [control.transpiler.br, 1]
                            )).toOpCodes(),
                    ).toOpCodes(),
                    ...i32.pop().store8(memory.memarg(0, 0), cursor.get().extract_lane(0).wrap()),
                    ...cursor.get().replace_lane(0, cursor.get().extract_lane(0).add(i64.const(BigInt(1)))).toOpCodes(),
                    ...currentValue.get().toOpCodes(),
                ])
            ))
        };
    }
}
