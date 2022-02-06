import { ErrorWithStatus } from "@akala/cli";
import { ServeMetadata, ServeOptions } from "@akala/commands";
import { serveMetadata } from "@akala/commands";
import State from '../state';

export default async function connect(this: State, name: string): Promise<ServeMetadata>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<void>
export default async function connect(this: State, name: string, context?: ServeOptions): Promise<ServeMetadata | void>
{
    let mapping = this.config.mapping[name];
    if (!mapping)
        mapping = Object.values(this.config.mapping).find(m => m.container === name);
    if (!mapping)
        mapping = this.processes[name];
    // console.log(name);
    // console.log(mapping);
    // console.log(options);
    if (context && context.args.length > 0)
        mapping.connect = serveMetadata(name, context);
    else
    {
        if (!mapping)
            throw new ErrorWithStatus(404, `Mapping ${name} could not be found`);
        return mapping.connect;
    }
    await this.config.commit()
}