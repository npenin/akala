import { ServeMetadata, ServeOptions } from "@akala/commands";
import { serveMetadata } from "@akala/commands";
import State from "../state";

export default function connect(this: State, name: string): ServeMetadata
export default function connect(this: State, name: string, options?: ServeOptions): void
export default function connect(this: State, name: string, options?: ServeOptions): ServeMetadata | void
{
    const mapping = this.config.mapping[name];
    console.log(name);
    console.log(mapping);
    console.log(options);
    if (options && options._.length > 1)
        mapping.connect = serveMetadata(name, options);
    else
        return mapping.connect;
}