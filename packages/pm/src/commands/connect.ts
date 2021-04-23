import { ServeMetadata, ServeOptions } from "@akala/commands";
import { serveMetadata } from "@akala/commands";
import State from "../state";

export default async function connect(this: State, name: string): Promise<ServeMetadata>
export default async function connect(this: State, name: string, options?: ServeOptions): Promise<void>
export default async function connect(this: State, name: string, options?: ServeOptions): Promise<ServeMetadata | void>
{
    let mapping = this.config.mapping[name];
    if (!mapping)
        mapping = Object.values(this.config.mapping).find(m => m.path === name);
    if (!mapping)
        throw new Error(`Mapping ${name} could not be found`);
    console.log(name);
    console.log(mapping);
    console.log(options);
    if (options && options.args.length > 1)
        mapping.connect = serveMetadata(name, options);
    else
        return mapping.connect;
    await this.config.save()
}