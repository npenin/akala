import { i32 } from "../helpers/i32.js";
import { i64 } from "../helpers/i64.js";
import { local } from "../helpers/local.js";
import { usizeType } from "../helpers/memory.js";
import { v128 } from "../helpers/v128.js"
import { u32 } from "../transpilers/wasmtype.js";

export class Cursor
{
    constructor(value: local<v128.i64>, address: usizeType<bigint | u32>)
    {
        this.offset = {
            get: address.convert_u(value.get().extract_lane(0)),
            set(offset: i32 | i64)
            {
                return value.get().replace_lane(0, offset instanceof i32 ? offset.extend_u() : offset)
            },
            inc: this.offset.set(this.offset.get.add(address.const(1)))
        };
        this.subByteOffset = {
            get: value.get().extract_lane(1).wrap(),
            set(offset: i32)
            {
                return value.get().replace_lane(1, offset.extend_u())
            }
        };
    }

    public readonly offset;
    public readonly subByteOffset;
} 
