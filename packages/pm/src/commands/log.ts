import State from "../state";

export default function ls(this: State, name: string)
{
    var p = this.processes.find(p => p.name == name)?.process;
    return p?.stderr;
}