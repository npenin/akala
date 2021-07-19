import { ServeOptions } from "@akala/commands";
import { Container } from "@akala/pm";

export default async function $init(name: string, pm: Container, options: ServeOptions)
{
    this.cwd = process.cwd();
    await pm.dispatch('connect', name, options);
}