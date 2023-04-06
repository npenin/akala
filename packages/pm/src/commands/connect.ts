import { ErrorWithStatus } from "@akala/core";
import { serveMetadata, ServeMetadata, ServeOptions } from "@akala/commands";
import { Configuration } from "@akala/config";
import State, { SidecarConfiguration } from '../state.js';

export default async function connect(this: State, name: string): Promise<ServeMetadata>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<void>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<ServeMetadata | void>
{
    let mapping = this.config.mapping[name];
    if (!mapping)
        mapping = Object.values(this.config.mapping).find(m => m.container === name);
    if (!mapping)
        mapping = Configuration.new(null, this.processes[name] as SidecarConfiguration);
    // console.log(name);
    // console.log(mapping);
    // console.log(options);
    if (context && context.args.length > 0)
    {
        if (!mapping)
            this.config.mapping.set(`${name}.connect`, serveMetadata(name, context));
        else
            mapping.set('connect', serveMetadata(name, context));
    }
    else
    {
        if (!mapping || !mapping.connect)
            throw new ErrorWithStatus(404, `Mapping ${name} could not be found`);
        return mapping.connect.extract();
    }
    await this.config.commit()
}