import { i32 } from './i32.js'
import { i64 } from './i64.js'
import { f32 } from './f32.js'
import { f64 } from './f64.js'
import { v128 } from './v128.js'
import { externref } from './ref-extern.js'
import { func } from './func.js'
import { indexes } from './wasmtype.js'
import { wasmtypeInstance } from '../helpers/wasmtype.js'

export { i32, i64, f32, f64, v128, externref, func }

export type valtype = typeof i32.type | typeof i64.type | typeof f32.type | typeof f64.type | typeof v128.type | typeof func.type | typeof externref.type;

export class blocktype
{
    public static readonly empty = 0x40;
    public static value(type: valtype) { return type; }
    public static type(type: indexes.type) { return type; }
}