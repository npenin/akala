import State from "../state";

export default function ls(this: State, name: string)
{
    console.log(this.processes);
    var p = this.processes.find(p => p.name == name)?.process;
    console.log(p)
    return p?.stdout;
}