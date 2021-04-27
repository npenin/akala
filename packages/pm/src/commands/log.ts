import { Readable } from "stream";
import State from '../state.js';

export default function ls(this: State, name: string): Readable
{
    const p = this.processes.find(p => p.name == name)?.process;
    return p?.stderr;
}