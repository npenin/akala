import State from '../state.js';

export default function status(this: State, name?: string): { name: string, filter: string, running: boolean, folder: string }[]
{
    let processes = Object.values(this.processes);
    if (name)
        processes = processes.filter(p => p.name == name);

    return processes.map(p => { return { name: p.name, filter: name, running: p.running, folder: p.path, stateless: p.stateless, type: p.type, cwd: p.cwd } })
}