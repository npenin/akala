import { ProxyConfiguration } from "@akala/config";
import { State } from "../state.js";

export default async function addLoader(this: ProxyConfiguration<State>, type: 'protocol' | 'format', loader: string)
{
    if (!this.loaders.has(type))
        this.loaders.set(type, []);
    this.loaders[type].push(loader);
    await this.loaders.commit()
}