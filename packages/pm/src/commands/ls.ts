import State from "../state";

export default function ls(this: State)
{
    return this.processes.map(p => { return { name: p.name, path: p.path } })
};