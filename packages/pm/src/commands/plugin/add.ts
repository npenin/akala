import State from "../../state.js";

export default function (this: State, plugin: string)
{
    this.config.plugins.push(plugin);
    return this.config.commit();
}