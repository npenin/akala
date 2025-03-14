import { ErrorWithStatus } from "@akala/core";
import { serveMetadata, ServeOptions } from "@akala/commands";
import State from '../state.js';

export default async function connect(this: State, name: string): Promise<Record<string, object>>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<void>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<Record<string, object> | void>
{
    let mapping = this.config.mapping[name];
    if (!mapping)
        mapping = Object.values(this.config.mapping).find(m => m.container === name);
    if (!mapping && this.processes[name]?.connect)
    {
        this.config.mapping.set(name, this.processes[name].connect);
        mapping = this.config.mapping.get(name);
    }    // console.log(name);
    // console.log(mapping);
    // console.log(mapping.connect);
    // console.log(context);
    if (context?.args?.length > 0)
    {
        if (!mapping)
            this.config.mapping.set(`${name}.connect`, serveMetadata({ args: context.args, options: { ...context.options, socketName: context.options?.socketName || name } }));
        else
            mapping.set('connect', serveMetadata({ args: context.args, options: { ...context.options, socketName: context.options?.socketName || name } }));
    }
    else
    {
        if (!mapping || !mapping.connect)
            throw new ErrorWithStatus(404, `Mapping ${name} could not be found`);
        return mapping.connect.extract();
    }
    await this.config.commit()
}