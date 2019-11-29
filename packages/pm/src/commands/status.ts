import State from "../state";

export default async function status(this: State, name?: string)
{
    var processes = this.processes;
    if (name)
        processes = processes.filter(p => p.name == name);

    return processes.map(p => { return { name: p.name, filter: name, running: p.running, folder: p.path } })
};

exports.default.inject = ['param.0']