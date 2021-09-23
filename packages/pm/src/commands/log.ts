import { PassThrough } from "stream";
import { Readable } from "stream";
import State from '../state';

export default function log(this: State, name: string): Readable
{
    if(name=='pm')
    {
        const pt=new PassThrough();
        process.stderr.pipe(pt);
        process.stdout.pipe(pt);
        return pt;
    }
    const p = this.processes.find(p => p.name == name)?.process;   
    return p?.stderr;
}