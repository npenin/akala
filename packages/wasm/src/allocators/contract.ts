import { usize } from "../helpers/memory.js";
import { u32 } from "../transpilers/wasmtype.js";

export interface Allocator<TNative extends bigint | u32>
{
    init(): void;
    start(): Uint8Array;
    malloc(size: TNative): usize<TNative>
}
