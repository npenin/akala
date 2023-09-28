import { memarg, usize } from "../helpers/memory.js";
import { u32 } from "../transpilers/wasmtype.js";

export interface Allocator<TNative extends bigint | u32>
{
    memory_start: memarg<number | bigint>;
    init(): void;
    start(): Uint8Array;
    malloc(size: usize<TNative>): usize<TNative>
    free(address: usize<TNative>)
}
