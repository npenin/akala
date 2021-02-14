import { ServeMetadata, ServeOptions } from "@akala/commands";
import { serveMetadata } from "@akala/commands";
import yargs from "yargs-parser";
import State from "../state";

export default function connect(this: State, name: string): ServeMetadata
export default function connect(this: State, name: string, options?: ServeOptions): void
export default function connect(this: State, name: string, options?: ServeOptions): ServeMetadata | void
{
    var mapping = this.config.mapping[name];
    console.log(options);
    if (options._.length > 1)
        mapping.connect = serveMetadata(name, options);
    else
        return mapping.connect;
}