# Commands

Commands is the second foundation block in the akala stack that allows running, well... commands.

You may want to check a live project to see how commands can be written: [see in pm commands](https://github.com/npenin/akala/tree/master/packages/pm/src/commands).
Typescript is preferred, but not mandatory.

# History

Starting commands block came from a simple idea: combining server less functions and redux approaches would be awesome. So here it is.

# Hello world

A command consist of any javascript file that exports a default function. You may also configure injection based on various providers (jsonrpc, cli, ...).

status.ts
```ts
import State from "../state";

export default async function status(this: State, name?: string)
{
    var processes = this.processes;
    if (name)
        processes = processes.filter(p => p.name == name);

    return processes.map(p => { return { name: p.name, filter: name, running: p.running, folder: p.path } })
};

exports.default.inject = ['param.0']
```

