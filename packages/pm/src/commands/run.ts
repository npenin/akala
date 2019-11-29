import State from "../state";

export default async function run(this: State, name: string, command: string, options: any)
{
    var p = this.processes.find(p => p.name == name);
    return await p?.dispatch(command, options);
};