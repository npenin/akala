import State from "../../state";

export default function (this: State, plugin: string)
{
    this.config.plugins.push(plugin);
    return this.config.commit();
}