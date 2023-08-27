import { indexes, wasmtype } from './wasmtype.js'

export enum local
{
    get = 0x20,
    set = 0x21,
    tee = 0x22,
}