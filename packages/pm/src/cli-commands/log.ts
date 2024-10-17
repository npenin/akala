import { PassThrough } from "stream";
import { Readable } from "stream";
import State from '../state.js';

export default function log(this: State, name: string): Readable
{
    const p = this.processes[name]?.process;

    const pt = new PassThrough();
    p.stderr.pipe(pt);
    p.stdout.pipe(pt);
    return pt;
}