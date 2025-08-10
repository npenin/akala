import { IsomorphicBuffer } from "@akala/core";
import { memarg, type usize } from "../helpers/memory.js";
import { type u32 } from "../transpilers/wasmtype.js";

export interface Allocator<TNative extends bigint | u32>
{
    memory_start: memarg<number | bigint>;
    init(): void;
    start(): IsomorphicBuffer;
    malloc(size: usize<TNative>): usize<TNative>
    free(address: usize<TNative>)
}
